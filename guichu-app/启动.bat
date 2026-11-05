@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ================================================
echo   归处 · 空间记忆管家  正在启动...
echo   请保持本窗口开启（关闭窗口 = 停止服务）
echo   浏览器访问： http://localhost:8080
echo ================================================
start "" "http://localhost:8080"
py -m http.server 8080 2>nul || python -m http.server 8080
pause
