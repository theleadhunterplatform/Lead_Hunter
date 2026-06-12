# Start Redis for Lead Hunter (Windows)
# Option A: Docker Desktop (recommended if installed)
# Option B: Memurai Developer (Redis-compatible, native Windows)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

function Test-RedisPort {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $client.Connect("127.0.0.1", 6379)
        $client.Close()
        return $true
    } catch {
        return $false
    }
}

if (Test-RedisPort) {
    Write-Host "Redis is already running on localhost:6379" -ForegroundColor Green
    exit 0
}

if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "Starting Redis via Docker Compose..." -ForegroundColor Cyan
    Push-Location $Root
    docker compose up -d redis
    Pop-Location

    Start-Sleep -Seconds 2
    if (Test-RedisPort) {
        Write-Host "Redis started (Docker) on redis://localhost:6379" -ForegroundColor Green
        exit 0
    }
}

$memuraiService = Get-Service -Name "Memurai*" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($memuraiService) {
    if ($memuraiService.Status -ne "Running") {
        Start-Service $memuraiService.Name
    }
    Start-Sleep -Seconds 1
    if (Test-RedisPort) {
        Write-Host "Redis started (Memurai) on redis://localhost:6379" -ForegroundColor Green
        exit 0
    }
}

Write-Host ""
Write-Host "Redis is not running. Install one of:" -ForegroundColor Yellow
Write-Host "  1. Docker Desktop, then run: npm run redis:start"
Write-Host "  2. Memurai Developer: winget install Memurai.MemuraiDeveloper"
Write-Host "     Then start the Memurai service and run this script again."
Write-Host "  3. Upstash (cloud): set REDIS_URL in backend/.env to your Upstash URL"
Write-Host ""
exit 1
