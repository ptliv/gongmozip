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
set "DEFAULT_TIMES=09:10,12:30,15:30,18:30,21:30"
echo One Gongmozip publish uses 2 API publishes: body + reply link.
echo With the local daily limit set to 10, use at most 5 scheduled times per day.
echo.
set /p "TIMES=Publish times HH:MM comma-separated [%DEFAULT_TIMES%]: "
if "%TIMES%"=="" set "TIMES=%DEFAULT_TIMES%"
echo.
echo [scheduler] Keep this terminal open. Press Ctrl+C to stop.
python scripts\threads_contest_scheduler.py --times "%TIMES%" --daily-limit 10 --audience %AUDIENCE% --count %COUNT%
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
