param(
    [string]$PrimaryDataDir = $env:PG_PRIMARY_DATA_DIR,
    [string]$Mode = 'fast'
)

. (Join-Path $PSScriptRoot 'replication-common.ps1')

if ([string]::IsNullOrWhiteSpace($PrimaryDataDir)) {
    throw 'PG_PRIMARY_DATA_DIR is not set. Pass -PrimaryDataDir or set PG_PRIMARY_DATA_DIR in your shell.'
}

if (-not (Test-Path $PrimaryDataDir)) {
    throw "Primary data directory does not exist: $PrimaryDataDir"
}

Invoke-PgTool -Binary 'pg_ctl' -Arguments @(
    '-D',
    $PrimaryDataDir,
    'stop',
    '-m',
    $Mode
)

Write-Host "Primary stopped: $PrimaryDataDir" -ForegroundColor Yellow
