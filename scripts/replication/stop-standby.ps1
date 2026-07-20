param(
    [string]$StandbyDataDir = (Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) 'pgdata_standby'),
    [string]$Mode = 'fast'
)

. (Join-Path $PSScriptRoot 'replication-common.ps1')

if (-not (Test-Path $StandbyDataDir)) {
    throw "Standby data directory does not exist: $StandbyDataDir"
}

Invoke-PgTool -Binary 'pg_ctl' -Arguments @(
    '-D',
    $StandbyDataDir,
    'stop',
    '-m',
    $Mode
)

Write-Host "Standby stopped: $StandbyDataDir" -ForegroundColor Yellow
