@echo off
echo StockMart Starting...
cd /d "C:\Users\User\OneDrive\Desktop\ecommerce"
taskkill /F /IM node.exe /T >nul 2>&1
timeout /t 1 >nul
start "" "http://localhost:3000"
node server.js
pause
