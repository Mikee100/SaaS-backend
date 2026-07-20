param(
    [string]$TaskName = 'AdeeraDatabaseBackupDaily',
    [string]$Time = '03:00'
)

$scriptPath = Join-Path $PSScriptRoot 'scripts\register-backup-task.ps1'
if (-not (Test-Path $scriptPath)) {
    throw "Could not find helper script at $scriptPath"
}

powershell -ExecutionPolicy Bypass -File $scriptPath -TaskName $TaskName -Time $Time -BackendPath $PSScriptRoot

if ($LASTEXITCODE -ne 0) {
    throw "Backup task registration failed with exit code $LASTEXITCODE"
}

Write-Host "Backup scheduler setup complete." -ForegroundColor Green
