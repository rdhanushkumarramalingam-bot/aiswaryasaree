@echo off
echo Stopping any running node processes...
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo Clearing Next.js lock file...
del /f /q ".next\dev\lock" >nul 2>&1

echo Starting dev server...
npm run dev
