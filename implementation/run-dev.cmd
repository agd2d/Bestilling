@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules" (
  echo node_modules mangler. Koer setup.cmd foerst.
  pause
  exit /b 1
)

if not exist ".env.local" (
  echo .env.local mangler. Koer setup.cmd foerst.
  pause
  exit /b 1
)

echo Starter udviklingsserver...
call npm.cmd run dev
pause
