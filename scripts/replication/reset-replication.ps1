param(
    [string]$StandbyDataDir = (Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) 'pgdata_standby'),
    [int]$StandbyPort = 5433,
    [string]$ReplicationUser = 'replicator',
    [int]$PrimaryPort,
    [string]$PrimaryHost
)

. (Join-Path $PSScriptRoot 'replication-common.ps1')

$backendRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$envPath = Join-Path $backendRoot '.env'
Import-DotEnvFile -Path $envPath

$connection = Get-PrimaryDbConnectionInfo
if (-not $PrimaryPort) {
    $PrimaryPort = $connection.Port
}
if ([string]::IsNullOrWhiteSpace($PrimaryHost)) {
    $PrimaryHost = $connection.Host
}

try {
    Invoke-PgTool -Binary 'pg_ctl' -Arguments @('-D', $StandbyDataDir, 'stop', '-m', 'fast')
}
catch {
    # Safe to continue if standby is not currently running.
}

& (Join-Path $PSScriptRoot 'init-standby.ps1') -StandbyDataDir $StandbyDataDir -StandbyPort $StandbyPort -ReplicationUser $ReplicationUser -PrimaryPort $PrimaryPort -PrimaryHost $PrimaryHost -Reinitialize
if ($LASTEXITCODE -ne 0) {
    throw 'init-standby.ps1 failed during reset.'
}

& (Join-Path $PSScriptRoot 'start-standby.ps1') -StandbyDataDir $StandbyDataDir -StandbyPort $StandbyPort
if ($LASTEXITCODE -ne 0) {
    throw 'start-standby.ps1 failed during reset.'
}

Write-Host 'Replication reset complete: fresh standby recreated from primary and started.' -ForegroundColor Green
