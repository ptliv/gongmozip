@echo off
setlocal
cd /d "%~dp0"

set "AUDIENCE=auto"
set "COUNT=5"

if /I "%~1"=="publish" goto publish
if /I "%~1"=="dry" goto dryrun
if /I "%~1"=="preview" goto dryrun

echo.
echo Gongmozip Threads Publisher
echo ===========================
echo 1. Dry-run preview only
echo 2. Publish to Threads
echo 3. List Threads profiles
echo 4. Exit
echo.
choice /C 1234 /N /M "Select: "
if errorlevel 4 goto end
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
