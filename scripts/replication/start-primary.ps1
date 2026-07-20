param(
    [string]$PrimaryDataDir = $env:PG_PRIMARY_DATA_DIR,
    [int]$PrimaryPort = 5432,
    [string]$LogDir = (Join-Path $PSScriptRoot 'logs')
)

. (Join-Path $PSScriptRoot 'replication-common.ps1')

if ([string]::IsNullOrWhiteSpace($PrimaryDataDir)) {
    throw 'PG_PRIMARY_DATA_DIR is not set. Pass -PrimaryDataDir or set PG_PRIMARY_DATA_DIR in your shell.'
}

if (-not (Test-Path $PrimaryDataDir)) {
    throw "Primary data directory does not exist: $PrimaryDataDir"
}

Ensure-Directory -Path $LogDir
$logPath = Join-Path $LogDir 'primary.log'

Invoke-PgTool -Binary 'pg_ctl' -Arguments @(
    '-D',
    $PrimaryDataDir,
    '-l',
    $logPath,
    '-o',
    "-p $PrimaryPort",
    'start'
)

Write-Host "Primary started from $PrimaryDataDir on port $PrimaryPort" -ForegroundColor Green
