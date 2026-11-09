@echo off
setlocal
echo ============================================================================
echo   TARPAULIN STUDIO - WINDOWS PRODUCTION SERVER (https://tarp.cyngfps.com)
echo ============================================================================

cd /d "%~dp0frontend"
echo [1/2] Building production React frontend bundle (frontend/dist)...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ERROR: Frontend production build failed!
    pause
    exit /b %ERRORLEVEL%
)

cd /d "%~dp0backend"
echo [2/2] Starting Unified FastAPI Production Server on 0.0.0.0:8811...
set TARP_ENV=production
set TARP_HOST=0.0.0.0
set TARP_PORT=8811
set TARP_ALLOWED_ORIGINS=https://tarp.cyngfps.com,http://tarp.cyngfps.com

python main.py
pause
