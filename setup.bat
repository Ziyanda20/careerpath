@echo off
echo ============================================
echo  CareerPath SA - First-time setup
echo ============================================
echo.

echo [1/4] Setting up Python backend...
cd backend
copy .env.example .env
python -m venv venv
call venv\Scripts\activate
pip install -r requirements.txt
echo Backend ready!
echo.

echo [2/4] Setting up Next.js frontend...
cd ..\frontend
call npm install
echo Frontend ready!
echo.

echo [3/4] Done! Now do these 3 things:
echo.
echo  A) Edit backend\.env and add your:
echo     - OPENAI_API_KEY  (get from platform.openai.com)
echo     - TESSERACT_PATH  (after installing Tesseract)
echo.
echo  B) Make sure MongoDB is running locally
echo     Download from: https://www.mongodb.com/try/download/community
echo.
echo  C) Seed the course database:
echo     cd scripts
echo     python seed_database.py
echo.
echo ============================================
echo  To START the app next time, run: start.bat
echo ============================================
pause
