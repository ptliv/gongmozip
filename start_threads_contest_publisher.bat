@echo off
setlocal
cd /d "%~dp0"

set "AUDIENCE=auto"
set "COUNT=5"

if /I "%~1"=="publish" goto publish
if /I "%~1"=="dry" goto dryrun
if /I "%~1"=="preview" goto dryrun
if /I "%~1"=="schedule" goto scheduler

echo.
echo Gongmozip Threads Publisher
echo ===========================
echo 1. Dry-run preview only
echo 2. Publish to Threads
echo 3. List Threads profiles
echo 4. Start scheduler in this terminal
echo 5. Exit
echo.
choice /C 12345 /N /M "Select: "
if errorlevel 5 goto end
if errorlevel 4 goto scheduler
if errorlevel 3 goto profiles
if errorlevel 2 goto publish
if errorlevel 1 goto dryrun

:dryrun
echo.
echo [dry-run] Preview only. Nothing will be posted.
python scripts\threads_contest_publisher.py --audience %AUDIENCE% --count %COUNT%
goto finish

:publish
echo.
echo [publish] Posting to Threads.
echo The link will be added as a shortened URL in the first reply.
python scripts\threads_contest_publisher.py --publish --audience %AUDIENCE% --count %COUNT%
goto finish

:profiles
echo.
python scripts\threads_contest_publisher.py --list-profiles
goto finish

:scheduler
echo.
set "DEFAULT_INTERVAL=60"
set "DEFAULT_JITTER=15"
echo One Gongmozip publish uses 2 API publishes: body + reply link.
echo The scheduler uses 60 minutes plus random extra minutes between runs.
echo With the local daily limit set to 10, it will publish at most 5 times per day.
echo.
set /p "START_AT=First publish time HH:MM [blank = after %DEFAULT_INTERVAL%+a minutes]: "
set /p "JITTER=Random extra minutes max [%DEFAULT_JITTER%]: "
if "%JITTER%"=="" set "JITTER=%DEFAULT_JITTER%"
echo.
echo [scheduler] Keep this terminal open. Press Ctrl+C to stop.
if "%START_AT%"=="" (
  python scripts\threads_contest_scheduler.py --interval-minutes %DEFAULT_INTERVAL% --jitter-minutes "%JITTER%" --daily-limit 10 --audience %AUDIENCE% --count %COUNT%
) else (
  python scripts\threads_contest_scheduler.py --interval-minutes %DEFAULT_INTERVAL% --jitter-minutes "%JITTER%" --start-at "%START_AT%" --daily-limit 10 --audience %AUDIENCE% --count %COUNT%
)
goto finish

:finish
set "EXIT_CODE=%ERRORLEVEL%"
echo.
if not "%EXIT_CODE%"=="0" (
  echo Finished with error code %EXIT_CODE%.
) else (
  echo Done.
)
echo.
pause
exit /b %EXIT_CODE%

:end
exit /b 0
