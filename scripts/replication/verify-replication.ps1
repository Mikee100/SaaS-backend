param(
    [int]$PrimaryPort,
    [string]$PrimaryHost,
    [int]$StandbyPort = 5433,
    [string]$StandbyHost = 'localhost'
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

$probeSql = @"
CREATE TABLE IF NOT EXISTS replication_learning_probe (
    id integer PRIMARY KEY,
    touched_at timestamptz NOT NULL
);
INSERT INTO replication_learning_probe (id, touched_at)
VALUES (1, now())
ON CONFLICT (id) DO UPDATE SET touched_at = EXCLUDED.touched_at;
SELECT id, touched_at FROM replication_learning_probe;
"@

$primaryReplicationSql = @"
SELECT application_name,
       client_addr,
       state,
       sync_state,
       write_lag,
       flush_lag,
       replay_lag
FROM pg_stat_replication;
"@

$standbyReceiverSql = @"
SELECT status,
       receive_start_lsn,
    written_lsn,
    flushed_lsn,
       latest_end_lsn,
       latest_end_time
FROM pg_stat_wal_receiver;
"@

$standbyReadSql = 'SELECT id, touched_at FROM replication_learning_probe;'
$standbyWriteSql = "INSERT INTO replication_learning_probe (id, touched_at) VALUES (999, now());"

$primaryArgs = @(
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
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    $probeSql,
    '-c',
    $primaryReplicationSql
)

Write-Host 'Running primary-side probe write and pg_stat_replication check...' -ForegroundColor Cyan
Invoke-PgTool -Binary 'psql' -Arguments $primaryArgs -Password $connection.Password

Start-Sleep -Seconds 2

$standbyReadArgs = @(
    '-h',
    $StandbyHost,
    '-p',
    "$StandbyPort",
    '-U',
    $connection.UserName,
    '-d',
    $connection.Database,
    '-P',
    'pager=off',
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    $standbyReceiverSql,
    '-c',
    $standbyReadSql
)

Write-Host 'Running standby-side pg_stat_wal_receiver and read check...' -ForegroundColor Cyan
Invoke-PgTool -Binary 'psql' -Arguments $standbyReadArgs -Password $connection.Password

$psqlPath = Resolve-PgBinary -BinaryName 'psql'
$writeTestArgs = @(
    '-h',
    $StandbyHost,
    '-p',
    "$StandbyPort",
    '-U',
    $connection.UserName,
    '-d',
    $connection.Database,
    '-P',
    'pager=off',
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    $standbyWriteSql
)

Write-Host 'Attempting standby write (expected to fail on read-only standby)...' -ForegroundColor Cyan
if (-not [string]::IsNullOrWhiteSpace($connection.Password)) {
    [Environment]::SetEnvironmentVariable('PGPASSWORD', $connection.Password, 'Process')
}

$tempOut = [System.IO.Path]::GetTempFileName()
$tempErr = [System.IO.Path]::GetTempFileName()

$argLine = ($writeTestArgs | ForEach-Object {
    if ($_ -match '\s') {
        '"' + $_.Replace('"', '""') + '"'
    }
    else {
        $_
    }
}) -join ' '

$proc = Start-Process -FilePath $psqlPath -ArgumentList $argLine -NoNewWindow -Wait -PassThru -RedirectStandardOutput $tempOut -RedirectStandardError $tempErr

if ($proc.ExitCode -eq 0) {
    Remove-Item -Path $tempOut, $tempErr -Force -ErrorAction SilentlyContinue
    throw 'Standby write unexpectedly succeeded. The standby may have been promoted already.'
}

Remove-Item -Path $tempOut, $tempErr -Force -ErrorAction SilentlyContinue

Write-Host 'Standby write was rejected as expected. Replication learning check passed.' -ForegroundColor Green
