@echo off
chcp 65001 >nul
cd /d "%~dp0"
cd frontfiles
python -m http.server 5500
pause
