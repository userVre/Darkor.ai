@echo off
del /f /q metro-start.out.log metro-start.err.log 2>nul
start "metro" /b cmd /c "npm.cmd run start > metro-start.out.log 2> metro-start.err.log"
