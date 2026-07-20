Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Import-DotEnvFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path $Path)) {
        return
    }

    Get-Content -Path $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith('#')) {
            return
        }

        $equalIndex = $line.IndexOf('=')
        if ($equalIndex -le 0) {
            return
        }

        $name = $line.Substring(0, $equalIndex).Trim()
        $value = $line.Substring($equalIndex + 1).Trim()

        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        if (-not [string]::IsNullOrWhiteSpace($name) -and -not [Environment]::GetEnvironmentVariable($name, 'Process')) {
            [Environment]::SetEnvironmentVariable($name, $value, 'Process')
        }
    }
}

function Get-RequiredEnv {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $value = [Environment]::GetEnvironmentVariable($Name, 'Process')
    if ([string]::IsNullOrWhiteSpace($value)) {
        throw "Required environment variable $Name is missing."
    }

    return $value
}

function Resolve-PgBinary {
    param(
        [Parameter(Mandatory = $true)]
        [string]$BinaryName
    )

    $candidateNames = @("$BinaryName.exe", $BinaryName)
    $pgBin = [Environment]::GetEnvironmentVariable('PG_BIN', 'Process')

    if (-not [string]::IsNullOrWhiteSpace($pgBin)) {
        foreach ($candidateName in $candidateNames) {
            $fullPath = Join-Path $pgBin $candidateName
            if (Test-Path $fullPath) {
                return $fullPath
            }
        }
    }

    foreach ($candidateName in $candidateNames) {
        $cmd = Get-Command $candidateName -ErrorAction SilentlyContinue
        if ($cmd) {
            return $cmd.Source
        }
    }

    throw "Could not find $BinaryName. Add PostgreSQL bin directory to PATH or set PG_BIN."
}

function Get-PrimaryDbConnectionInfo {
    $databaseUrl = Get-RequiredEnv -Name 'DATABASE_URL'

    try {
        $uri = [System.Uri]$databaseUrl
    }
    catch {
        throw 'DATABASE_URL is not a valid URI.'
    }

    if (-not $uri.Scheme.StartsWith('postgres')) {
        throw 'DATABASE_URL must start with postgres:// or postgresql://'
    }

    $userInfoParts = $uri.UserInfo.Split(':', 2)
    $userName = [System.Uri]::UnescapeDataString($userInfoParts[0])
    $password = ''

    if ($userInfoParts.Length -gt 1) {
        $password = [System.Uri]::UnescapeDataString($userInfoParts[1])
    }

    $databaseName = [System.Uri]::UnescapeDataString($uri.AbsolutePath.TrimStart('/'))

    if ([string]::IsNullOrWhiteSpace($userName) -or [string]::IsNullOrWhiteSpace($databaseName) -or [string]::IsNullOrWhiteSpace($uri.Host)) {
        throw 'DATABASE_URL must include host, user, and database.'
    }

    $port = $uri.Port
    if ($port -le 0) {
        $port = 5432
    }

    return [PSCustomObject]@{
        Host = $uri.Host
        Port = $port
        UserName = $userName
        Password = $password
        Database = $databaseName
    }
}

function Invoke-PgTool {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Binary,
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,
        [string]$Password
    )

    $toolPath = Resolve-PgBinary -BinaryName $Binary

    if (-not [string]::IsNullOrWhiteSpace($Password)) {
        [Environment]::SetEnvironmentVariable('PGPASSWORD', $Password, 'Process')
    }

    & $toolPath @Arguments

    if ($LASTEXITCODE -ne 0) {
        throw "$Binary failed with exit code $LASTEXITCODE"
    }
}

function Ensure-Directory {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path $Path)) {
        New-Item -ItemType Directory -Path $Path | Out-Null
    }
}
