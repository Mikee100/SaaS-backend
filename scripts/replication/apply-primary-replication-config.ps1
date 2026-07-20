param(
    [int]$PrimaryPort,
    [string]$PrimaryHost,
    [string]$ReplicationUser = 'replicator'
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

$psqlPath = Resolve-PgBinary -BinaryName 'psql'
if (-not [string]::IsNullOrWhiteSpace($connection.Password)) {
    [Environment]::SetEnvironmentVariable('PGPASSWORD', $connection.Password, 'Process')
}

$showArgs = @(
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
    'SHOW config_file; SHOW hba_file;'
)

$output = & $psqlPath @showArgs
if ($LASTEXITCODE -ne 0) {
    throw 'Could not read config_file/hba_file from primary.'
}

$lines = ($output -split "`r?`n") | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
if ($lines.Count -lt 2) {
    throw 'Did not receive expected config_file and hba_file paths.'
}

$configFile = $lines[0].Trim()
$hbaFile = $lines[1].Trim()

if (-not (Test-Path $configFile)) {
    throw "Primary config file not found: $configFile"
}
if (-not (Test-Path $hbaFile)) {
    throw "Primary hba file not found: $hbaFile"
}

$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
Copy-Item $configFile "$configFile.bak.$stamp"
Copy-Item $hbaFile "$hbaFile.bak.$stamp"

$configText = Get-Content -Path $configFile -Raw
if ($configText -notmatch '(?m)^\s*wal_level\s*=') {
    Add-Content -Path $configFile -Value "`n# Replication learning: include WAL detail for standby replay`nwal_level = replica"
}
if ($configText -notmatch '(?m)^\s*max_wal_senders\s*=') {
    Add-Content -Path $configFile -Value "`n# Replication learning: allow WAL sender processes for standby connections`nmax_wal_senders = 3"
}
if ($configText -notmatch '(?m)^\s*wal_keep_size\s*=') {
    Add-Content -Path $configFile -Value "`n# Replication learning: keep enough WAL for standby catch-up after brief disconnects`nwal_keep_size = 512MB"
}

$hbaText = Get-Content -Path $hbaFile -Raw
$ipv4Rule = "host    replication    $ReplicationUser    127.0.0.1/32    scram-sha-256"
$ipv6Rule = "host    replication    $ReplicationUser    ::1/128         scram-sha-256"

if ($hbaText -notmatch [Regex]::Escape($ipv4Rule)) {
    Add-Content -Path $hbaFile -Value "`n# Replication learning: allow local standby connection for replication role`n$ipv4Rule"
}
if ($hbaText -notmatch [Regex]::Escape($ipv6Rule)) {
    Add-Content -Path $hbaFile -Value $ipv6Rule
}

Write-Host "Applied primary replication config updates." -ForegroundColor Green
Write-Host "Backups created:" -ForegroundColor Gray
Write-Host "- $configFile.bak.$stamp" -ForegroundColor Gray
Write-Host "- $hbaFile.bak.$stamp" -ForegroundColor Gray
Write-Host 'Restart PostgreSQL primary service for changes to take effect.' -ForegroundColor Yellow
