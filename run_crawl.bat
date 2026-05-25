@echo off
title Crawling

cd /d "%~dp0"

echo ========================================
echo  Crawling start...
echo ========================================
echo.

python scripts\crawl_all.py

echo.
echo ========================================
if %ERRORLEVEL% EQU 0 (
    echo  Done!
) else (
    echo  Error: %ERRORLEVEL%
)
echo ========================================
echo.
pause
