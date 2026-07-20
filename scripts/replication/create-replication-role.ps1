param(
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

$replicationPassword = Get-RequiredEnv -Name 'PG_REPLICATION_PASSWORD'

$escapedUser = $ReplicationUser.Replace('"', '""')
$escapedPassword = $replicationPassword.Replace('''', '''''')

$sql = @"
DO
`$`$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$ReplicationUser') THEN
        EXECUTE format('CREATE ROLE %I WITH REPLICATION LOGIN PASSWORD %L', '$ReplicationUser', '$escapedPassword');
    ELSE
        EXECUTE format('ALTER ROLE %I WITH REPLICATION LOGIN PASSWORD %L', '$ReplicationUser', '$escapedPassword');
    END IF;
END;
`$`$;
"@

$psqlArgs = @(
    '-h',
    $PrimaryHost,
    '-p',
    "$PrimaryPort",
    '-U',
    $connection.UserName,
    '-d',
    'postgres',
    '-P',
    'pager=off',
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    $sql
)

Invoke-PgTool -Binary 'psql' -Arguments $psqlArgs -Password $connection.Password
Write-Host "Replication role '$ReplicationUser' is ready on primary ${PrimaryHost}:$PrimaryPort" -ForegroundColor Green
