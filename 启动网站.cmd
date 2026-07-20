@echo off
cd /d "%~dp0"
start "背书计划" http://127.0.0.1:3210
node server.js
