@echo off
title Mafia Game - Deploy to Hugging Face
echo ============================================================
echo       MAFIA SECRET CARD - HUGGING FACE DEPLOYMENT
echo ============================================================
echo.
echo Space: https://huggingface.co/spaces/ahmad99627/mafia-game
echo.
echo Please create a Write Token at:
echo https://huggingface.co/settings/tokens
echo (Click 'New token' -> Type: Write -> Copy token)
echo.
set /p HF_TOKEN="Enter your Hugging Face Access Token (hf_...): "

if "%HF_TOKEN%"=="" (
    echo Error: Token cannot be empty!
    pause
    exit /b
)

echo.
echo Configuring remote with token...
git remote remove space 2>nul
git remote add space https://ahmad99627:%HF_TOKEN%@huggingface.co/spaces/ahmad99627/mafia-game
git branch -M main

echo.
echo Pushing code to Hugging Face...
git push space main --force

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================================
    echo [SUCCESS] Code successfully pushed to Hugging Face!
    echo.
    echo Your game is now building on the cloud:
    echo Space URL: https://huggingface.co/spaces/ahmad99627/mafia-game
    echo Direct URL: https://ahmad99627-mafia-game.hf.space
    echo ============================================================
) else (
    echo.
    echo [ERROR] Git push failed. Please verify your token has 'Write' permissions.
)

echo.
pause
