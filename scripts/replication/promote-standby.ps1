param(
    [string]$StandbyDataDir = (Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) 'pgdata_standby'),
    [int]$StandbyPort = 5433,
    [string]$StandbyHost = 'localhost'
)

. (Join-Path $PSScriptRoot 'replication-common.ps1')

$backendRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$envPath = Join-Path $backendRoot '.env'
Import-DotEnvFile -Path $envPath

$connection = Get-PrimaryDbConnectionInfo

if (-not (Test-Path $StandbyDataDir)) {
    throw "Standby data directory does not exist: $StandbyDataDir"
}

Invoke-PgTool -Binary 'pg_ctl' -Arguments @(
    '-D',
    $StandbyDataDir,
    'promote'
)

$checkArgs = @(
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
    '-t',
    '-A',
    '-c',
    'SELECT pg_is_in_recovery();'
)

$psqlPath = Resolve-PgBinary -BinaryName 'psql'
if (-not [string]::IsNullOrWhiteSpace($connection.Password)) {
    [Environment]::SetEnvironmentVariable('PGPASSWORD', $connection.Password, 'Process')
}

$recoveryState = (& $psqlPath @checkArgs).Trim()
if ($LASTEXITCODE -ne 0) {
    throw 'Could not verify promotion status from standby.'
}

if ($recoveryState -eq 'f') {
    Write-Host 'Standby promotion successful. It is now writable.' -ForegroundColor Green
}
else {
    throw "Promotion did not complete yet. pg_is_in_recovery() returned: $recoveryState"
}
