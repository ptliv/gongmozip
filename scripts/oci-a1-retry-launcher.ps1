param(
  [string]$ConfigPath = "$PSScriptRoot\oci-a1-config.json",
  [int]$DelaySeconds = 75,
  [int]$MaxAttempts = 0,
  [switch]$ShuffleAvailabilityDomains,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
}

function Require-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "'$Name' command not found. Install OCI CLI first, then run 'oci setup config'."
  }
}

function Read-JsonFile {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Config file not found: $Path`nCopy scripts\oci-a1-config.example.json to scripts\oci-a1-config.json and fill in your OCIDs."
  }
  return Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json
}

function Get-RequiredText {
  param(
    [object]$Config,
    [string]$Name
  )
  $value = [string]$Config.$Name
  if ([string]::IsNullOrWhiteSpace($value) -or $value.Contains("replace_me")) {
    throw "Missing required config value: $Name"
  }
  return $value.Trim()
}

function Get-Shuffled {
  param([object[]]$Items)
  return $Items | Sort-Object { Get-Random }
}

function Build-LaunchPayload {
  param(
    [object]$Config,
    [string]$AvailabilityDomain,
    [string]$SshPublicKey
  )

  $payload = [ordered]@{
    availabilityDomain = $AvailabilityDomain
    compartmentId = Get-RequiredText $Config "compartmentId"
    displayName = if ([string]::IsNullOrWhiteSpace($Config.displayName)) { "a1-flex-auto" } else { [string]$Config.displayName }
    shape = "VM.Standard.A1.Flex"
    shapeConfig = [ordered]@{
      ocpus = [double]$Config.ocpus
      memoryInGBs = [double]$Config.memoryInGBs
    }
    createVnicDetails = [ordered]@{
      subnetId = Get-RequiredText $Config "subnetId"
      assignPublicIp = if ($null -eq $Config.assignPublicIp) { $true } else { [bool]$Config.assignPublicIp }
    }
    sourceDetails = [ordered]@{
      sourceType = "image"
      imageId = Get-RequiredText $Config "imageId"
    }
    metadata = [ordered]@{
      ssh_authorized_keys = $SshPublicKey
    }
  }

  if ($Config.bootVolumeSizeInGBs) {
    $payload.sourceDetails["bootVolumeSizeInGBs"] = [int]$Config.bootVolumeSizeInGBs
  }
  if ($Config.freeformTags) {
    $payload["freeformTags"] = $Config.freeformTags
  }

  return $payload
}

function Invoke-OciLaunch {
  param(
    [object]$Config,
    [object]$Payload
  )

  $payloadPath = Join-Path $env:TEMP ("oci-a1-launch-{0}.json" -f ([guid]::NewGuid().ToString("N")))
  $Payload | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $payloadPath -Encoding UTF8

  $globalArgs = @()
  if (-not [string]::IsNullOrWhiteSpace($Config.profile)) {
    $globalArgs += @("--profile", [string]$Config.profile)
  }
  if (-not [string]::IsNullOrWhiteSpace($Config.region)) {
    $globalArgs += @("--region", [string]$Config.region)
  }

  try {
    if ($DryRun) {
      Write-Step "DRY RUN payload saved: $payloadPath"
      Get-Content -LiteralPath $payloadPath -Encoding UTF8
      return @{ Success = $true; Output = "dry-run"; PayloadPath = $payloadPath }
    }

    $output = & oci @globalArgs compute instance launch --from-json "file://$payloadPath" --output json 2>&1
    $exitCode = $LASTEXITCODE
    $text = ($output | Out-String).Trim()
    return @{
      Success = ($exitCode -eq 0)
      Output = $text
      PayloadPath = $payloadPath
    }
  } finally {
    if (-not $DryRun -and (Test-Path -LiteralPath $payloadPath)) {
      Remove-Item -LiteralPath $payloadPath -Force
    }
  }
}

function Is-CapacityError {
  param([string]$Text)
  return $Text -match "Out of host capacity|capacity|용량이 부족|Insufficient|LimitExceeded|InternalError"
}

if (-not $DryRun) {
  Require-Command "oci"
}

$config = Read-JsonFile $ConfigPath
$adList = @($config.availabilityDomains | ForEach-Object { [string]$_ } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
if ($adList.Count -eq 0) {
  throw "availabilityDomains is empty. Add AD names such as 'xxxx:AP-SEOUL-1-AD-1'."
}

$ocpus = if ($config.ocpus) { [double]$config.ocpus } else { 1 }
$memory = if ($config.memoryInGBs) { [double]$config.memoryInGBs } else { 6 }
if ($ocpus -le 0 -or $memory -le 0) {
  throw "ocpus and memoryInGBs must be positive numbers."
}
$config | Add-Member -NotePropertyName "ocpus" -NotePropertyValue $ocpus -Force
$config | Add-Member -NotePropertyName "memoryInGBs" -NotePropertyValue $memory -Force

$sshPublicKeyFile = Get-RequiredText $config "sshPublicKeyFile"
if (-not (Test-Path -LiteralPath $sshPublicKeyFile)) {
  throw "SSH public key file not found: $sshPublicKeyFile"
}
$sshPublicKey = (Get-Content -LiteralPath $sshPublicKeyFile -Raw -Encoding ASCII).Trim()
if ([string]::IsNullOrWhiteSpace($sshPublicKey)) {
  throw "SSH public key file is empty: $sshPublicKeyFile"
}

Write-Step "Starting OCI A1.Flex retry launcher"
Write-Step "Config: $ConfigPath"
Write-Step "Shape: VM.Standard.A1.Flex / OCPU=$ocpus / Memory=${memory}GB"
Write-Step "ADs: $($adList -join ', ')"
Write-Step "Delay: ${DelaySeconds}s / MaxAttempts: $(if ($MaxAttempts -gt 0) { $MaxAttempts } else { 'unlimited' })"

$attempt = 0
while ($true) {
  $cycleAds = if ($ShuffleAvailabilityDomains) { @(Get-Shuffled $adList) } else { $adList }

  foreach ($ad in $cycleAds) {
    $attempt++
    if ($MaxAttempts -gt 0 -and $attempt -gt $MaxAttempts) {
      throw "Reached MaxAttempts=$MaxAttempts without creating an instance."
    }

    Write-Step "Attempt #$attempt on AD: $ad"
    $payload = Build-LaunchPayload -Config $config -AvailabilityDomain $ad -SshPublicKey $sshPublicKey
    $result = Invoke-OciLaunch -Config $config -Payload $payload

    if ($result.Success) {
      Write-Step "SUCCESS"
      if ($result.Output -and $result.Output -ne "dry-run") {
        try {
          $json = $result.Output | ConvertFrom-Json
          Write-Host ("Instance OCID: {0}" -f $json.data.id)
          Write-Host ("Lifecycle: {0}" -f $json.data."lifecycle-state")
          Write-Host ("AD: {0}" -f $json.data."availability-domain")
        } catch {
          Write-Host $result.Output
        }
      }
      exit 0
    }

    $message = [string]$result.Output
    if (Is-CapacityError $message) {
      Write-Step "Capacity/API retryable error. Will retry after delay."
      Write-Host ($message -split "`n" | Select-Object -First 8 | Out-String).Trim()
    } else {
      Write-Step "Non-capacity error. Stop to avoid repeating a bad request."
      Write-Host $message
      exit 1
    }

    Start-Sleep -Seconds $DelaySeconds
  }
}
