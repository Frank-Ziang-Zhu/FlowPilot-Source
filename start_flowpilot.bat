@echo off
setlocal
cd /d "%~dp0"
title FlowPilot
if exist "runtime\python.exe" (
  "runtime\python.exe" -B server.py --open %*
  goto done
)
if defined FLOWPILOT_PYTHON (
  "%FLOWPILOT_PYTHON%" -B server.py --open %*
  goto done
)
py -3 -c "import sys; assert sys.version_info >= (3,10)" >nul 2>&1
if not errorlevel 1 (
  py -3 -B server.py --open %*
  goto done
)
python -c "import sys; assert sys.version_info >= (3,10)" >nul 2>&1
if not errorlevel 1 (
  python -B server.py --open %*
  goto done
)
echo Python 3.10+ is required for SOURCE edition.
echo Download the Windows portable ZIP from this repository's Releases instead.
:done
echo Server stopped. You can close this window.
pause
