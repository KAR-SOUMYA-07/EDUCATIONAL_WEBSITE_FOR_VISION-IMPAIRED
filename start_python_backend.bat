@echo off
echo 🎤 Voice Learning Platform - Python Backend
echo ==========================================
echo.

echo Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found. Please install Python 3.8 or higher.
    echo Download from: https://python.org
    pause
    exit /b 1
)

echo ✅ Python found
echo.

echo Installing Python dependencies...
pip install -r python-requirements.txt
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    echo Try running: python -m pip install -r python-requirements.txt
    pause
    exit /b 1
)

echo.
echo 🚀 Starting Python backend server...
echo Backend will be available at: http://localhost:5000
echo.
echo Press Ctrl+C to stop the server
echo.

cd python-backend
python app.py