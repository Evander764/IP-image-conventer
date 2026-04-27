@echo off
cd /d "%~dp0"
call npm.cmd run dev
if errorlevel 1 (
  echo.
  echo Failed to start IP-image-conventer.
  pause
)
