@echo off
chcp 65001 >nul
cd /d "%~dp0"
cd "AI算法"
python app.py
pause
