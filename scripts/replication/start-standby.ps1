param(
    [string]$StandbyDataDir = (Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) 'pgdata_standby'),
    [int]$StandbyPort = 5433,
    [string]$LogDir = (Join-Path $PSScriptRoot 'logs')
)

. (Join-Path $PSScriptRoot 'replication-common.ps1')

if (-not (Test-Path $StandbyDataDir)) {
    throw "Standby data directory does not exist: $StandbyDataDir"
}

Ensure-Directory -Path $LogDir
$logPath = Join-Path $LogDir 'standby.log'

Invoke-PgTool -Binary 'pg_ctl' -Arguments @(
    '-D',
    $StandbyDataDir,
    '-l',
    $logPath,
    '-o',
    "-p $StandbyPort",
    'start'
)

Write-Host "Standby started from $StandbyDataDir on port $StandbyPort" -ForegroundColor Green
