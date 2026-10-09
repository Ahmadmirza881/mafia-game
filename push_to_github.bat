@echo off
title Mafia Game - Push to GitHub
echo ============================================================
echo         MAFIA SECRET CARD - PUSH TO GITHUB
echo ============================================================
echo.
echo Please create a new empty repository at:
echo https://github.com/new
echo.
set /p REPO_URL="Enter your GitHub Repository URL (e.g. https://github.com/Ahmadmirza881/mafia-game.git): "

if "%REPO_URL%"=="" (
    echo Error: Repository URL cannot be empty!
    pause
    exit /b
)

echo.
echo Adding remote origin: %REPO_URL%
git remote remove origin 2>nul
git remote add origin %REPO_URL%
git branch -M main

echo.
echo Pushing code to GitHub...
git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================================
    echo [SUCCESS] Code successfully pushed to GitHub!
    echo.
    echo Now open https://render.com and deploy:
    echo 1. Sign in with GitHub on Render.com
    echo 2. Click 'New +' -^> 'Web Service'
    echo 3. Select this repository
    echo 4. Click 'Deploy Web Service'
    echo ============================================================
) else (
    echo.
    echo [ERROR] Git push failed. Please check your GitHub permissions or credentials.
)

echo.
pause
