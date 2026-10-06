$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
Write-Host "Starting Apex Signal backend from project root..." -ForegroundColor Cyan
python -m uvicorn app.main:app --reload --port 8000
