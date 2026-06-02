@echo off
REM Eskom Theft Detection — Local Development Setup (Windows)

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║  Eskom Theft Detection - Local Development Setup              ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

REM Check if .env exists
if not exist ".env" (
    echo ⚠️  .env file not found
    echo Creating .env from .env.example...
    if exist ".env.example" (
        copy ".env.example" ".env"
        echo ✅ .env created. Please edit it with your actual credentials:
        echo    - SUPABASE_URL
        echo    - SUPABASE_KEY
        echo    - JWT_SECRET
        echo    - OPENAI_API_KEY
        echo.
        echo Edit the .env file and run this script again.
        pause
        exit /b 1
    ) else (
        echo ❌ .env.example not found. Cannot proceed.
        pause
        exit /b 1
    )
)

REM Check if node_modules exists
if not exist "node_modules\" (
    echo.
    echo 📦 Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ npm install failed
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed
)

REM Check Node.js version
echo.
echo 🔍 Checking Node.js version...
node --version

REM Start the server
echo.
echo 🚀 Starting Eskom Theft Detection server...
echo.
echo ═══════════════════════════════════════════════════════════════
echo Server will be available at: http://localhost:3000
echo ═══════════════════════════════════════════════════════════════
echo.

node server.js
pause
