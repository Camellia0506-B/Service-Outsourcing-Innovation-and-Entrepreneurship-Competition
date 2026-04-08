::[Bat To Exe Converter]
::
::YAwzoRdxOk+EWAjk
::fBw5plQjdCqDJF6W9UYhPR5HWDiSNWiuE6cZpuH44Io=
::YAwzuBVtJxjWCl3EqQJgSA==
::ZR4luwNxJguZRRnk
::Yhs/ulQjdF+5
::cxAkpRVqdFKZSzk=
::cBs/ulQjdF+5
::ZR41oxFsdFKZSDk=
::eBoioBt6dFKZSDk=
::cRo6pxp7LAbNWATEpCI=
::egkzugNsPRvcWATEpCI=
::dAsiuh18IRvcCxnZtBJQ
::cRYluBh/LU+EWAnk
::YxY4rhs+aU+IeA==
::cxY6rQJ7JhzQF1fEqQJhZks0
::ZQ05rAF9IBncCkqN+0xwdVsFAlTi
::ZQ05rAF9IAHYFVzEqQK4yffQlP4K+48/7keaETJzDDcDf759
::eg0/rx1wNQPfEVWB+kM9LVsJDGQ=
::fBEirQZwNQPfEVWB+kM9LVsJDGQ=
::cRolqwZ3JBvQF1fEqQJQ
::dhA7uBVwLU+EWDk=
::YQ03rBFzNR3SWATElA==
::dhAmsQZ3MwfNWATElA==
::ZQ0/vhVqMQ3MEVWAtB9wSA==
::Zg8zqx1/OA3MEVWAtB9wSA==
::dhA7pRFwIByZRRnk
::Zh4grVQjdCqDJF6W9UYhPR5HWDgK3Yc+3k+ULwx+BxgBW5eVtz+7pXyV36yLQA==
::YB416Ek+ZG8=
::
::
::978f952a14a936cc963da21a135fa983
@echo off
title GradQuest Launcher

set "ROOT=%~dp0"

echo =========================
echo   GRADQUEST STARTING
echo =========================

echo.
echo Starting AI Service...
start "AI Service" cmd /k "cd /d "%ROOT%ai" && venv\Scripts\activate && python app.py"

echo.
echo Starting Frontend...
start "Frontend" cmd /k "cd /d "%ROOT%frontend" && python -m http.server 8080"

echo.
echo Starting Java Backend...
start "Backend" cmd /k "cd /d "%ROOT%backend" && mvn spring-boot:run"

timeout /t 5 >nul
start http://127.0.0.1:8080