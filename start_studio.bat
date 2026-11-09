@echo off
echo Starting Tarpaulin Studio Backend (Port 8811) and Frontend (Port 5173)...
start "Tarpaulin Studio Backend" cmd /k "cd /d %~dp0backend && python main.py"
start "Tarpaulin Studio Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
echo Tarpaulin Studio is launching at http://localhost:5173

