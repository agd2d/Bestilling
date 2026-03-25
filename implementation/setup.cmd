@echo off
setlocal
cd /d "%~dp0"

echo [1/3] Kontrollerer Node.js...
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js er ikke installeret. Installer Node 20+ og proev igen.
  pause
  exit /b 1
)

echo [2/3] Installerer dependencies...
call npm.cmd install
if errorlevel 1 (
  echo npm install fejlede.
  pause
  exit /b 1
)

if not exist ".env.local" (
  echo [3/3] Opretter .env.local fra .env.example...
  copy /Y ".env.example" ".env.local" >nul
  echo Udfyld .env.local med rigtige noegler foer du koerer sync.
) else (
  echo [3/3] .env.local findes allerede.
)

echo Setup er faerdig.
pause
