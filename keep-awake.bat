@echo off
title PACIFY keep-awake pinger
set URL=https://pacify-server.onrender.com/health

echo PACIFY keep-awake — pinging %URL% every 3 minutes.
echo The free Render server sleeps after ~15 idle minutes; this keeps it awake.
echo Close this window (or press Ctrl+C) to stop.
echo NOTE: the first ping can take up to 90s if the server is asleep right now.
echo.

:loop
for /f %%i in ('curl -s -o NUL -w "%%{http_code}" --max-time 90 %URL%') do set CODE=%%i
if "%CODE%"=="200" (
  echo [%date% %time%] awake  ^(HTTP %CODE%^)
) else (
  echo [%date% %time%] ping failed  ^(HTTP %CODE%^)  — server may be waking, it will retry
)
REM ~3 minute wait (ping waits ~1s per packet — used because `timeout` can be
REM shadowed by Git's GNU timeout on machines with Git in the system PATH)
C:\Windows\System32\ping.exe -n 181 127.0.0.1 >nul
goto loop
