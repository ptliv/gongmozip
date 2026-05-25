param(
  [string]$Profile = "DEFAULT",
  [string]$Region = "ap-seoul-1",
  [int]$DelaySeconds = 75,
  [switch]$ShuffleAvailabilityDomains
)

$ErrorActionPreference = "Stop"
$env:PYTHONWARNINGS = "ignore"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$ConfigPath = Join-Path $PSScriptRoot "oci-a1-config.json"
$LauncherPath = Join-Path $PSScriptRoot "oci-a1-retry-launcher.ps1"
$OciConfigPath = Join-Path $env:USERPROFILE ".oci\config"
$SshPublicKeyFile = Join-Path $env:USERPROFILE ".ssh\id_rsa.pub"

function Write-Step {
  param([string]$Message)
  Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
}

function Find-Oci {
  $cmd = Get-Command oci -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }

  $candidates = @(
    (Join-Path $env:APPDATA "Python\Python311\Scripts\oci.exe"),
    (Join-Path $env:LOCALAPPDATA "Programs\Python\Python311\Scripts\oci.exe")
  )
  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
      $scriptDir = Split-Path -Parent $candidate
      if (-not (($env:PATH -split ";") -contains $scriptDir)) {
        $env:PATH = "$scriptDir;$env:PATH"
      }
      return $candidate
    }
  }

  throw "OCI CLI was not found. Install with: python -m pip install --user oci-cli"
}

function Parse-IniProfile {
  param(
    [string]$Path,
    [string]$ProfileName
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    return @{}
  }

  $current = ""
  $data = @{}
  foreach ($line in Get-Content -LiteralPath $Path -Encoding UTF8) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#")) { continue }
    if ($trimmed -match "^\[(.+)\]$") {
      $current = $Matches[1]
      continue
    }
    if ($current -ne $ProfileName) { continue }
    if ($trimmed -match "^([^=]+)=(.*)$") {
      $data[$Matches[1].Trim()] = $Matches[2].Trim()
    }
  }
  return $data
}

function Invoke-OciJson {
  param([string[]]$Arguments)
  $profileData = Parse-IniProfile -Path $OciConfigPath -ProfileName $Profile
  $authArgs = @()
  if (
    $profileData.ContainsKey("auth") -and
    -not [string]::IsNullOrWhiteSpace($profileData["auth"])
  ) {
    $authArgs += @("--auth", [string]$profileData["auth"])
  } elseif ($profileData.ContainsKey("security_token_file")) {
    $authArgs += @("--auth", "security_token")
  }
  $errorPath = Join-Path $env:TEMP ("oci-a1-error-{0}.txt" -f ([guid]::NewGuid().ToString("N")))
  try {
    $output = & oci @Arguments --profile $Profile --region $Region @authArgs --output json 2> $errorPath
    if ($LASTEXITCODE -ne 0) {
      $errorText = if (Test-Path -LiteralPath $errorPath) {
        Get-Content -LiteralPath $errorPath -Raw -ErrorAction SilentlyContinue
      } else {
        ""
      }
      throw (($errorText, ($output | Out-String)) -join "`n").Trim()
    }
  } finally {
    if (Test-Path -LiteralPath $errorPath) {
      Remove-Item -LiteralPath $errorPath -Force -ErrorAction SilentlyContinue
    }
  }
  return ($output | Out-String | ConvertFrom-Json)
}

function Ensure-SshKey {
  if (Test-Path -LiteralPath $SshPublicKeyFile) { return }

  Write-Step "Creating SSH key: $SshPublicKeyFile"
  $sshDir = Split-Path -Parent $SshPublicKeyFile
  New-Item -ItemType Directory -Force -Path $sshDir | Out-Null
  $privateKey = [System.IO.Path]::ChangeExtension($SshPublicKeyFile, $null)
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = "ssh-keygen.exe"
  $psi.Arguments = "-t rsa -b 4096 -N `"`" -f `"$privateKey`""
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $process = [System.Diagnostics.Process]::Start($psi)
  $process.WaitForExit()
  Write-Host $process.StandardOutput.ReadToEnd()
  Write-Host $process.StandardError.ReadToEnd()
  if ($process.ExitCode -ne 0) {
    throw "ssh-keygen failed with exit code $($process.ExitCode)."
  }
  if (-not (Test-Path -LiteralPath $SshPublicKeyFile)) {
    throw "SSH public key could not be created: $SshPublicKeyFile"
  }
}

function Ensure-Session {
  $profileData = Parse-IniProfile -Path $OciConfigPath -ProfileName $Profile
  if ($profileData.ContainsKey("tenancy") -and $profileData.ContainsKey("region")) {
    Write-Step "OCI profile exists: $Profile"
    return
  }

  Write-Step "Starting OCI browser login. Complete the Oracle login in the browser window."
  & oci session authenticate --profile-name $Profile --region $Region
  if ($LASTEXITCODE -ne 0) {
    throw "OCI session authentication failed."
  }
}

function Select-Subnet {
  param([string]$CompartmentId)

  $subnets = Invoke-OciJson @("network", "subnet", "list", "--compartment-id", $CompartmentId, "--all")
  $items = @($subnets.data)
  $publicSubnet = $items |
    Where-Object { $_."lifecycle-state" -eq "AVAILABLE" -and $_."prohibit-public-ip-on-vnic" -ne $true } |
    Select-Object -First 1
  if ($publicSubnet) { return $publicSubnet.id }

  $anySubnet = $items | Where-Object { $_."lifecycle-state" -eq "AVAILABLE" } | Select-Object -First 1
  if ($anySubnet) { return $anySubnet.id }

  throw "No subnet found in root compartment. Create a public VCN/subnet in OCI Console, then rerun this script."
}

function Select-Image {
  param([string]$CompartmentId)

  $images = Invoke-OciJson @(
    "compute", "image", "list",
    "--compartment-id", $CompartmentId,
    "--shape", "VM.Standard.A1.Flex",
    "--all",
    "--sort-by", "TIMECREATED",
    "--sort-order", "DESC"
  )
  $items = @($images.data)
  $ubuntu = $items |
    Where-Object { $_."operating-system" -match "Canonical Ubuntu" -and $_."lifecycle-state" -eq "AVAILABLE" } |
    Select-Object -First 1
  if ($ubuntu) { return $ubuntu.id }

  $oracleLinux = $items |
    Where-Object { $_."operating-system" -match "Oracle Linux" -and $_."lifecycle-state" -eq "AVAILABLE" } |
    Select-Object -First 1
  if ($oracleLinux) { return $oracleLinux.id }

  $anyImage = $items | Where-Object { $_."lifecycle-state" -eq "AVAILABLE" } | Select-Object -First 1
  if ($anyImage) { return $anyImage.id }

  throw "No VM.Standard.A1.Flex-compatible image found in region $Region."
}

function Build-LauncherConfig {
  $profileData = Parse-IniProfile -Path $OciConfigPath -ProfileName $Profile
  $tenancy = [string]$profileData["tenancy"]
  if ([string]::IsNullOrWhiteSpace($tenancy)) {
    throw "Could not read tenancy OCID from $OciConfigPath profile [$Profile]."
  }

  Write-Step "Finding availability domains"
  $ads = Invoke-OciJson @("iam", "availability-domain", "list", "--compartment-id", $tenancy)
  $adNames = @($ads.data | ForEach-Object { $_.name } | Where-Object { $_ })
  if ($adNames.Count -eq 0) {
    throw "No availability domains returned for tenancy."
  }

  Write-Step "Finding public subnet"
  $subnetId = Select-Subnet -CompartmentId $tenancy

  Write-Step "Finding latest A1-compatible image"
  $imageId = Select-Image -CompartmentId $tenancy

  $config = [ordered]@{
    profile = $Profile
    auth = "security_token"
    region = $Region
    displayName = "a1-flex-4c24g-auto"
    compartmentId = $tenancy
    subnetId = $subnetId
    imageId = $imageId
    availabilityDomains = $adNames
    ocpus = 4
    memoryInGBs = 24
    bootVolumeSizeInGBs = 150
    assignPublicIp = $true
    sshPublicKeyFile = $SshPublicKeyFile
    freeformTags = @{
      createdBy = "gongmozip-oci-a1-retry"
    }
  }

  $config | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $ConfigPath -Encoding UTF8
  Write-Step "Wrote launcher config: $ConfigPath"
}

Set-Location $RepoRoot
Find-Oci | Out-Null
Ensure-SshKey
Ensure-Session
Build-LauncherConfig

$launcherArgs = @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", $LauncherPath,
  "-ConfigPath", $ConfigPath,
  "-DelaySeconds", [string]$DelaySeconds
)
if ($ShuffleAvailabilityDomains) {
  $launcherArgs += "-ShuffleAvailabilityDomains"
}

Write-Step "Starting retry launcher"
& powershell @launcherArgs
