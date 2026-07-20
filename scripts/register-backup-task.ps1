param(
    [string]$TaskName = 'AdeeraDatabaseBackupDaily',
    [string]$Time = '03:00',
    [string]$BackendPath = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)

$npmPath = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
if (-not $npmPath) {
    throw 'npm.cmd was not found in PATH. Install Node.js or adjust PATH before running this script.'
}

$action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument "/c cd /d \"$BackendPath\" && npm run backup:daily"
$trigger = New-ScheduledTaskTrigger -Daily -At $Time
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force

Write-Host "Scheduled task '$TaskName' created/updated to run daily at $Time." -ForegroundColor Green
Write-Host "Command: npm run backup:daily" -ForegroundColor Gray
Write-Host "Backend path: $BackendPath" -ForegroundColor Gray
