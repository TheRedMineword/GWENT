@echo off
start https://drmineword-gwent.onrender.com/wake
start "Server 1" cmd /k node .server.js
start "Server 2" cmd /k node server.js
start http://localhost:8080