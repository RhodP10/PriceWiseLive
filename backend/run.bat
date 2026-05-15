@echo off
echo ========================================
echo PriceWise Backend - FastAPI + SQLAlchemy
echo ========================================
echo.

cd /d "%~dp0"

REM Check if venv exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate venv
call venv\Scripts\activate.bat

REM Install/upgrade dependencies
echo Installing dependencies...
pip install -q -r requirements.txt
pip install uvicorn
pip install fastapi uvicorn
pip install sqlalchemy
pip install sqlalchemy psycopg2-binary python-dotenv passlib bcrypt python-jose
pip install playwright
python -m playwright install chromium

echo.
echo Playwright Chromium (for Shopee/Lazada listing sync — first run downloads browser)...
python -m playwright install chromium

echo.
echo ========================================
echo Starting FastAPI server...
echo ========================================
echo.
echo API Running: http://localhost:8000
echo Docs: http://localhost:8000/docs
echo ReDoc: http://localhost:8000/redoc
echo.

python -m uvicorn main:app --reload --port 8000

pause
