#!/usr/bin/env pwsh
# ════════════════════════════════════════════════════════════════════════
# Ticklora ITSM — Start Balanced Architecture Stack (Windows PowerShell)
# Run: .\start-all.ps1
# ════════════════════════════════════════════════════════════════════════

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Ticklora ITSM — Balanced Stack         ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "🚀 Starting services..." -ForegroundColor Green
Write-Host ""

# Start Spring Boot backend in a new window
$sbPath = Join-Path $Root "core-service-springboot"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$sbPath'; Write-Host '=== SPRING BOOT CORE SERVICE ===' -ForegroundColor Green; if (Get-Command java -ErrorAction SilentlyContinue) { java -jar target/ticklora-core-1.0.0.jar } else { Write-Host 'Error: java is not in your PATH. Please start the Spring Boot app from your IDE (e.g. IntelliJ/VS Code) or install Java 17+.' -ForegroundColor Red }" -WindowStyle Normal
Start-Sleep 2

# Start React Frontend in a new terminal window
$parentPath = Split-Path $Root
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$parentPath'; Write-Host '=== REACT FRONTEND ===' -ForegroundColor Yellow; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  All services starting...                ║" -ForegroundColor Cyan
Write-Host "║                                          ║" -ForegroundColor Cyan
Write-Host "║  Frontend Dev Server: http://localhost:5173  ║" -ForegroundColor White
Write-Host "║  Spring Boot Backend: http://localhost:3000  ║" -ForegroundColor White
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: Frontend requests are automatically proxied to the Spring Boot backend on port 3000." -ForegroundColor Gray
Write-Host ""
