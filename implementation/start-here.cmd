@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo Varebestilling - Start Here
echo ========================================
echo.

if not exist "node_modules" (
  echo node_modules mangler. Koerer setup foerst...
  call "%~dp0setup.cmd"
  if errorlevel 1 (
    echo Setup fejlede.
    pause
    exit /b 1
  )
)

if not exist ".env.local" (
  echo .env.local mangler.
  echo Der bliver oprettet en fra .env.example via setup.
  call "%~dp0setup.cmd"
  if errorlevel 1 (
    echo Setup fejlede.
    pause
    exit /b 1
  )
  echo.
  echo Udfyld .env.local og koer derefter start-here.cmd igen.
  pause
  exit /b 0
)

echo Starter udviklingsserver...
call "%~dp0run-dev.cmd"
