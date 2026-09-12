@echo off
setlocal

REM Start ServeSmart's FastAPI backend from the project root.
set "PROJECT_DIR=%~dp0"
set "BACKEND_DIR=%PROJECT_DIR%backend"
set "PYTHON=%BACKEND_DIR%\.venv\Scripts\python.exe"

if not exist "%BACKEND_DIR%\main.py" (
    echo ERROR: Could not find backend\main.py.
    pause
    exit /b 1
)

if not exist "%PYTHON%" (
    echo Creating the Python virtual environment...
    py -m venv "%BACKEND_DIR%\.venv"
    if errorlevel 1 (
        echo ERROR: Python could not create the virtual environment.
        pause
        exit /b 1
    )

    echo Installing FastAPI dependencies. This may take a moment...
    "%PYTHON%" -m pip install -r "%BACKEND_DIR%\requirements.txt"
    if errorlevel 1 (
        echo ERROR: Dependency installation failed.
        pause
        exit /b 1
    )
)

echo Starting ServeSmart at http://localhost:5000
echo Keep this window open while using the website.
cd /d "%BACKEND_DIR%"
"%PYTHON%" -m uvicorn main:app --host 0.0.0.0 --port 5000 --reload

if errorlevel 1 pause
