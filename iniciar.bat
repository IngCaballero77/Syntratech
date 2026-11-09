@echo off
title Servidor Syntratech
cd /d "%~dp0"
if exist "server.ps1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
) else (
    echo No se encontro server.ps1.
    pause
)
