# ========================================================================
# Ticklora ITSM - Start Unified Stack (Single Localhost Entry Point)
# Run: .\start-app.ps1
# ========================================================================

$Root = $PSScriptRoot

Write-Host ""
Write-Host "=========================================="
Write-Host "   Ticklora ITSM - Unified Stack          "
Write-Host "=========================================="
Write-Host ""

# 1. Setup Java and Maven paths for this session
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot"
$env:Path = "C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot\bin;" + $Root + "\maven\apache-maven-3.9.6\bin;" + $env:Path

# 2. Load environment variables from .env file
$EnvFile = Join-Path $Root ".env"
if (Test-Path $EnvFile) {
    Write-Host "Loading environment variables from .env..."
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $key, $val = $line -split '=', 2
            $key = $key.Trim()
            $val = $val.Trim()
            if (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'"))) {
                $val = $val.Substring(1, $val.Length - 2)
            }
            [System.Environment]::SetEnvironmentVariable($key, $val, [System.EnvironmentVariableTarget]::Process)
        }
    }
} else {
    Write-Warning ".env file not found at $EnvFile"
}

# Also load microservices/.env to fallback or merge key values
$MicroserviceEnvFile = Join-Path $Root "microservices\.env"
if (Test-Path $MicroserviceEnvFile) {
    Write-Host "Loading microservice specific variables..."
    Get-Content $MicroserviceEnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $key, $val = $line -split '=', 2
            $key = $key.Trim()
            $val = $val.Trim()
            if (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'"))) {
                $val = $val.Substring(1, $val.Length - 2)
            }
            $existingVal = [System.Environment]::GetEnvironmentVariable($key)
            if ([string]::IsNullOrEmpty($existingVal)) {
                [System.Environment]::SetEnvironmentVariable($key, $val, [System.EnvironmentVariableTarget]::Process)
            }
        }
    }
}

Write-Host ""
Write-Host "Starting Spring Boot Unified Server..."
Write-Host ""
Write-Host "App URL: http://localhost:3000"
Write-Host "Database: MySQL localhost:3306"
Write-Host ""

$TargetDir = Join-Path $Root "microservices\core-service-springboot"
cd $TargetDir
java -jar target/ticklora-core-1.0.0.jar
