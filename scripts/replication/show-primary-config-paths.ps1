param(
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

$psqlArgs = @(
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
    '-c',
    "SHOW config_file; SHOW hba_file;"
)

Invoke-PgTool -Binary 'psql' -Arguments $psqlArgs -Password $connection.Password
