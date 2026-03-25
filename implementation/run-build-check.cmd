@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules" (
  echo node_modules mangler. Koer setup.cmd foerst.
  pause
  exit /b 1
)

echo Koerer build-check...
call npm.cmd run build
pause
