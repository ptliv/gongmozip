@echo off
setlocal
cd /d "%~dp0.."

REM Publish one Gongmozip contest roundup to Threads.
REM The Python script reuses THREADS_PROFILE_NAME or the single active profile
REM in C:\madeinmine\threads auto\threads_automator\data\app.db.

python scripts\threads_contest_publisher.py --publish --audience auto --count 5
set EXIT_CODE=%ERRORLEVEL%

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Threads contest publisher failed with exit code %EXIT_CODE%.
)

exit /b %EXIT_CODE%
