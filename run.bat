@echo off
title Mafia Card Distributor Launcher
color 0A

echo ===================================================
echo   MAFIA SECRET CARD DISTRIBUTION SYSTEM - LAUNCHER
echo ===================================================
echo.
echo 1. Starting FastAPI Backend on 0.0.0.0:8000 ...
start "Mafia Backend (FastAPI)" cmd /k "python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"

echo 2. Waiting for backend to initialize...
timeout /t 2 /nobreak >nul

echo 3. Starting React + Vite Frontend for Mobile & PC ...
start "Mafia Frontend (Vite)" cmd /k "cd frontend && npm run dev -- --host 0.0.0.0 --port 5173"

echo 4. Waiting for frontend to start...
timeout /t 2 /nobreak >nul

echo 5. Opening Mafia Game in your browser...
start http://localhost:5173

for /f "tokens=4" %%a in ('route print^|findstr 0.0.0.0.*0.0.0.0') do (
    set LOCAL_IP=%%a
)

echo.
echo ===================================================
echo   APPLICATION RUNNING SUCCESSFULLY!
echo ===================================================
echo   💻 Computer (Local) : http://localhost:5173
echo   📱 Mobile Phone     : http://192.168.100.72:5173
echo   📡 Backend API      : http://0.0.0.0:8000
echo ===================================================
echo   NOTE: Phone aur Computer same Wi-Fi par hone chahiye!
echo   Players apne phone browser mein yeh link open karein:
echo   http://192.168.100.72:5173
echo ===================================================
pause >nul
