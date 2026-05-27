param(
    [string]$TaskName = "Gongmozip Threads Publisher",
    [string]$At = "09:10",
    [string]$Python = "python",
    [string]$Audience = "auto",
    [int]$Count = 5
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Resolve-Path (Join-Path $scriptDir "..")
$publisher = Join-Path $root "scripts\threads_contest_publisher.py"

if (-not (Test-Path $publisher)) {
    throw "Publisher script not found: $publisher"
}

$argument = "scripts\threads_contest_publisher.py --publish --audience $Audience --count $Count"
$action = New-ScheduledTaskAction -Execute $Python -Argument $argument -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -Daily -At $At
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel LeastPrivilege
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -MultipleInstances IgnoreNew

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Principal $principal `
    -Settings $settings `
    -Force | Out-Null

Write-Host "Registered scheduled task: $TaskName"
Write-Host "Daily time: $At"
Write-Host "Working directory: $root"
Write-Host "Command: $Python $argument"
