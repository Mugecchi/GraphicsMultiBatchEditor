# Run this script in an Administrator PowerShell on your Windows Server to register
# Tarpaulin Studio (port 8811) to auto-start on boot via Windows Task Scheduler.

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$FrontendDir = Join-Path $ProjectRoot "frontend"
$BackendDir  = Join-Path $ProjectRoot "backend"
$TaskName    = "TarpaulinStudio_Port8811"

Write-Host "[1/3] Building production frontend bundle..." -ForegroundColor Cyan
Push-Location $FrontendDir
npm install
npm run build
Pop-Location

Write-Host "[2/3] Creating headless runner script..." -ForegroundColor Cyan
$RunnerPath = Join-Path $ProjectRoot "run_server_headless.bat"
$PythonExe = (Get-Command python).Source

$RunnerContent = @"
@echo off
cd /d "$BackendDir"
set TARP_ENV=production
set TARP_HOST=0.0.0.0
set TARP_PORT=8811
set TARP_ALLOWED_ORIGINS=https://tarp.cyngfps.com,http://tarp.cyngfps.com
"$PythonExe" main.py >> "$BackendDir\storage\server.log" 2>&1
"@
Set-Content -Path $RunnerPath -Value $RunnerContent -Encoding ASCII

Write-Host "[3/3] Registering Windows Scheduled Task '$TaskName' (At Startup)..." -ForegroundColor Cyan
$Action    = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$RunnerPath`"" -WorkingDirectory $BackendDir
$Trigger   = New-ScheduledTaskTrigger -AtStartup
$Settings  = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
$Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal -Force | Out-Null
Start-ScheduledTask -TaskName $TaskName

Write-Host ""
Write-Host "SUCCESS! Tarpaulin Studio is now running on port 8811 and will automatically start whenever the Windows Server reboots." -ForegroundColor Green
Write-Host "Logs: $BackendDir\storage\server.log"
