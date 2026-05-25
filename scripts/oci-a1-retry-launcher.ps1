param(
  [string]$ConfigPath = "$PSScriptRoot\oci-a1-config.json",
  [int]$DelaySeconds = 75,
  [int]$MaxAttempts = 0,
  [switch]$ShuffleAvailabilityDomains,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$env:PYTHONWARNINGS = "ignore"

function Write-Step {
  param([string]$Message)
  Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
}

function Send-DiscordNotification {
  param(
    [object]$Config,
    [string]$Title,
    [string]$Description,
    [int]$Color = 3447003,
    [hashtable]$Fields = @{}
  )

  $webhookUrl = ""
  if ($Config -and $Config.PSObject.Properties.Name -contains "discordWebhookUrl") {
    $webhookUrl = [string]$Config.discordWebhookUrl
  }
  if ([string]::IsNullOrWhiteSpace($webhookUrl) -and -not [string]::IsNullOrWhiteSpace($env:OCI_A1_DISCORD_WEBHOOK_URL)) {
    $webhookUrl = $env:OCI_A1_DISCORD_WEBHOOK_URL
  }
  if ([string]::IsNullOrWhiteSpace($webhookUrl)) { return }

  $fieldItems = @()
  foreach ($key in $Fields.Keys) {
    $value = [string]$Fields[$key]
    if ($value.Length -gt 1000) {
      $value = $value.Substring(0, 997) + "..."
    }
    $fieldItems += @{
      name = [string]$key
      value = if ([string]::IsNullOrWhiteSpace($value)) { "-" } else { $value }
      inline = $true
    }
  }

  $payload = @{
    username = "OCI A1 Retry"
    embeds = @(
      @{
        title = $Title
        description = $Description
        color = $Color
        timestamp = (Get-Date).ToUniversalTime().ToString("o")
        fields = $fieldItems
      }
    )
  }

  try {
    $json = $payload | ConvertTo-Json -Depth 8
    $body = [System.Text.Encoding]::UTF8.GetBytes($json)
    Invoke-RestMethod -Uri $webhookUrl -Method Post -ContentType "application/json; charset=utf-8" -Body $body | Out-Null
  } catch {
    Write-Step "Discord notification failed: $($_.Exception.Message)"
  }
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
    subnetId = Get-RequiredText $Config "subnetId"
    imageId = Get-RequiredText $Config "imageId"
    assignPublicIp = if ($null -eq $Config.assignPublicIp) { $true } else { [bool]$Config.assignPublicIp }
    shapeConfig = [ordered]@{
      ocpus = [double]$Config.ocpus
      memoryInGBs = [double]$Config.memoryInGBs
    }
    metadata = [ordered]@{
      ssh_authorized_keys = $SshPublicKey
    }
  }

  $payload["bootVolumeSizeInGbs"] = if ($Config.bootVolumeSizeInGBs) { [int]$Config.bootVolumeSizeInGBs } else { 150 }
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
  $Payload | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $payloadPath -Encoding ASCII

  $globalArgs = @()
  if (-not [string]::IsNullOrWhiteSpace($Config.profile)) {
    $globalArgs += @("--profile", [string]$Config.profile)
  }
  if (-not [string]::IsNullOrWhiteSpace($Config.region)) {
    $globalArgs += @("--region", [string]$Config.region)
  }
  if (-not [string]::IsNullOrWhiteSpace($Config.auth)) {
    $globalArgs += @("--auth", [string]$Config.auth)
  }

  try {
    if ($DryRun) {
      Write-Step "DRY RUN payload saved: $payloadPath"
      Get-Content -LiteralPath $payloadPath -Encoding UTF8
      return @{ Success = $true; Output = "dry-run"; PayloadPath = $payloadPath }
    }

    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
      $output = & oci @globalArgs compute instance launch --from-json "file://$payloadPath" --output json 2>&1
      $exitCode = $LASTEXITCODE
    } finally {
      $ErrorActionPreference = $previousErrorActionPreference
    }
    $text = ($output | ForEach-Object { $_.ToString() } | Out-String).Trim()
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
  $patterns = @(
    "out of host capacity",
    "capacity",
    "insufficient",
    "limitexceeded",
    "internalerror"
  )
  $lowerText = $Text.ToLowerInvariant()
  foreach ($pattern in $patterns) {
    if ($lowerText.Contains($pattern)) {
      return $true
    }
  }
  return $false
}

if (-not $DryRun) {
  Require-Command "oci"
}

$config = Read-JsonFile $ConfigPath
$adList = @($config.availabilityDomains | ForEach-Object { [string]$_ } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
if ($adList.Count -eq 0) {
  throw "availabilityDomains is empty. Add AD names such as 'xxxx:AP-SEOUL-1-AD-1'."
}

$ocpus = if ($config.ocpus) { [double]$config.ocpus } else { 4 }
$memory = if ($config.memoryInGBs) { [double]$config.memoryInGBs } else { 24 }
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
Send-DiscordNotification -Config $config `
  -Title "OCI A1 retry started" `
  -Description "Started retrying the A1.Flex maximum free-tier shape." `
  -Color 3447003 `
  -Fields @{
    Region = [string]$config.region
    Shape = "VM.Standard.A1.Flex"
    OCPU = [string]$ocpus
    Memory = "${memory}GB"
    BootVolume = "$(if ($config.bootVolumeSizeInGBs) { $config.bootVolumeSizeInGBs } else { 150 })GB"
    Delay = "${DelaySeconds}s"
    ADs = ($adList -join ", ")
  }

$attempt = 0
while ($true) {
  $cycleAds = if ($ShuffleAvailabilityDomains) { @(Get-Shuffled $adList) } else { $adList }

  foreach ($ad in $cycleAds) {
    $attempt++
    if ($MaxAttempts -gt 0 -and $attempt -gt $MaxAttempts) {
      Send-DiscordNotification -Config $config `
        -Title "OCI A1 retry stopped" `
        -Description "The retry launcher reached the maximum attempt count and stopped." `
        -Color 15158332 `
        -Fields @{
          Attempts = [string]($attempt - 1)
          Region = [string]$config.region
          Shape = "4 OCPU / 24GB / 150GB"
        }
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
          Send-DiscordNotification -Config $config `
            -Title "OCI A1 instance created" `
            -Description "The instance launch request succeeded." `
            -Color 3066993 `
            -Fields @{
              Instance = [string]$json.data.id
              Lifecycle = [string]$json.data."lifecycle-state"
              AD = [string]$json.data."availability-domain"
              Region = [string]$config.region
              Attempts = [string]$attempt
              Shape = "4 OCPU / 24GB / 150GB"
            }
        } catch {
          Write-Host $result.Output
          Send-DiscordNotification -Config $config `
            -Title "OCI A1 instance created" `
            -Description "The launch request succeeded, but response JSON parsing failed." `
            -Color 3066993 `
            -Fields @{
              Region = [string]$config.region
              Attempts = [string]$attempt
              Output = [string]$result.Output
            }
        }
      }
      exit 0
    }

    $message = [string]$result.Output
    if (Is-CapacityError $message) {
      Write-Step "Capacity/API retryable error. Will retry after delay."
      Write-Host ($message -split "`n" | Select-Object -First 8 | Out-String).Trim()
      $summary = ($message -split "`r?`n" | Where-Object { $_.Trim() } | Select-Object -First 10) -join "`n"
      Send-DiscordNotification -Config $config `
        -Title "OCI A1 capacity unavailable" `
        -Description "The launch request failed with a retryable capacity/API error. Retrying after ${DelaySeconds}s." `
        -Color 15844367 `
        -Fields @{
          Attempt = [string]$attempt
          Region = [string]$config.region
          AD = [string]$ad
          Shape = "4 OCPU / 24GB / 150GB"
          Error = $summary
        }
    } else {
      Write-Step "Non-capacity error. Stop to avoid repeating a bad request."
      Write-Host $message
      Send-DiscordNotification -Config $config `
        -Title "OCI A1 retry stopped - check config" `
        -Description "The launcher stopped because the error was not recognized as a capacity issue." `
        -Color 15158332 `
        -Fields @{
          Attempt = [string]$attempt
          Region = [string]$config.region
          AD = [string]$ad
          Error = [string]$message
        }
      exit 1
    }

    Start-Sleep -Seconds $DelaySeconds
  }
}
