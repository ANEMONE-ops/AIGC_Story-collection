@echo off
cd /d "%~dp0"
where python >nul 2>nul
if not errorlevel 1 (
  start "" "http://127.0.0.1:8765/index.html"
  python -m http.server 8765 --bind 127.0.0.1
  goto :eof
)
where py >nul 2>nul
if not errorlevel 1 (
  start "" "http://127.0.0.1:8765/index.html"
  py -m http.server 8765 --bind 127.0.0.1
  goto :eof
)
echo Python was not found. Open index.html directly, or install Python to use the local preview.
pause
