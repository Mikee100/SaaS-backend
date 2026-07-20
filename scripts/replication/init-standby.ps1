param(
    [string]$StandbyDataDir = (Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) 'pgdata_standby'),
    [int]$StandbyPort = 5433,
    [string]$ReplicationUser = 'replicator',
    [int]$PrimaryPort,
    [string]$PrimaryHost,
    [switch]$Reinitialize
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

$replicationPassword = Get-RequiredEnv -Name 'PG_REPLICATION_PASSWORD'

$primaryShowArgs = @(
    '-h',
    $PrimaryHost,
    '-p',
    "$PrimaryPort",
    '-U',
    $connection.UserName,
    '-d',
    $connection.Database,
    '-P',
    'pager=off',
    '-t',
    '-A',
    '-c',
    'SHOW max_wal_senders;'
)

$psqlPath = Resolve-PgBinary -BinaryName 'psql'
if (-not [string]::IsNullOrWhiteSpace($connection.Password)) {
    [Environment]::SetEnvironmentVariable('PGPASSWORD', $connection.Password, 'Process')
}

$primaryMaxWalSendersOutput = (& $psqlPath @primaryShowArgs).Trim()
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($primaryMaxWalSendersOutput)) {
    throw 'Could not read max_wal_senders from primary before standby initialization.'
}

$primaryMaxWalSenders = [int]$primaryMaxWalSendersOutput

if (Test-Path $StandbyDataDir) {
    if (-not $Reinitialize) {
        throw "Standby data directory already exists: $StandbyDataDir. Re-run with -Reinitialize to replace it."
    }

    try {
        Invoke-PgTool -Binary 'pg_ctl' -Arguments @('-D', $StandbyDataDir, 'stop', '-m', 'fast')
    }
    catch {
        # Ignore stop failures because the standby may simply not be running.
    }

    Remove-Item -Path $StandbyDataDir -Recurse -Force
}

Ensure-Directory -Path $StandbyDataDir

$baseBackupArgs = @(
    '-h',
    $PrimaryHost,
    '-p',
    "$PrimaryPort",
    '-U',
    $ReplicationUser,
    '-D',
    $StandbyDataDir,
    '-Fp',
    '-Xs',
    '-P',
    '-R'
)

Invoke-PgTool -Binary 'pg_basebackup' -Arguments $baseBackupArgs -Password $replicationPassword

$autoConfigPath = Join-Path $StandbyDataDir 'postgresql.auto.conf'
Add-Content -Path $autoConfigPath -Value "port = $StandbyPort"
Add-Content -Path $autoConfigPath -Value 'hot_standby = on'
Add-Content -Path $autoConfigPath -Value "max_wal_senders = $primaryMaxWalSenders"

Write-Host "Standby base backup complete at $StandbyDataDir" -ForegroundColor Green
Write-Host "Start standby with: powershell -ExecutionPolicy Bypass -File .\scripts\replication\start-standby.ps1 -StandbyDataDir \"$StandbyDataDir\" -StandbyPort $StandbyPort" -ForegroundColor Gray
