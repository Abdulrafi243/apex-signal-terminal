@echo off
cd /d "%~dp0"
echo Starting Apex Signal backend from project root...
python -m uvicorn app.main:app --reload --port 8000
pause
