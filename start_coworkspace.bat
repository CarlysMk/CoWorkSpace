@echo off
setlocal ENABLEDELAYEDEXPANSION

REM ===== Fixed project name to keep the same volume across runs =====
SET "PROJNAME=coworkspace"
SET "DB_USER=cowork"
SET "DB_NAME=coworkdb"

REM ===== Optional reset flag =====
SET "RESET=%1"
IF /I "%RESET%"=="--reset" (
  echo [RESET] Stopping and removing volumes...
  docker compose -p %PROJNAME% down -v
) ELSE (
  echo [NORMAL] Stopping without removing volumes...
  docker compose -p %PROJNAME% down
)

REM ===== Start only the database =====
echo Starting database...
docker compose -p %PROJNAME% up -d db

REM ===== Wait until the DB is ready =====
echo Waiting for database to be ready...
docker compose -p %PROJNAME% exec -T db sh -lc "until pg_isready -U %DB_USER% -d %DB_NAME% >/dev/null 2>&1; do sleep 1; done; echo db ok"

REM ===== (Optional) Run migrations if present =====
if exist "backups\migrate_add_capacity_and_sequences.sql" (
  echo Running optional migrations...
  docker compose -p %PROJNAME% exec -T db sh -lc "psql -U %DB_USER% -d %DB_NAME% -f /app/backups/migrate_add_capacity_and_sequences.sql" || echo (migration script ended)
) else (
  echo No extra migration script found (skipping).
)

REM ===== Start backend and frontend =====
echo Starting backend and frontend...
docker compose -p %PROJNAME% up -d --build backend frontend

echo All services are up.
endlocal

REM ===== SWAGGER (UI + HEALTH/LOCATIONS/BOOKING con fallback e AUTO-HYDRATE) =====
echo Starting Swagger (port 9090)...
if "%PROJNAME%"=="" set "PROJNAME=coworkspace"
set "SW_CONT=%PROJNAME%_swagger"
set "SW_TMP=%TEMP%\cowork_swagger"

docker rm -f "%SW_CONT%" >nul 2>&1
if exist "%SW_TMP%" rd /s /q "%SW_TMP%"
mkdir "%SW_TMP%\swagger-ui" >nul 2>&1
mkdir "%SW_TMP%\mock" >nul 2>&1

powershell -NoProfile -Command "$b='b3BlbmFwaTogMy4wLjMKaW5mbzoKICB0aXRsZTogQ29Xb3JrU3BhY2UgQVBJCiAgdmVyc2lvbjogMS4yLjAKc2VydmVyczoKICAtIHVybDogLwpwYXRoczoKICAvYXBpL2hlYWx0aDoKICAgIGdldDoKICAgICAgc3VtbWFyeTogSGVhbHRoIGNoZWNrCiAgICAgIHJlc3BvbnNlczoKICAgICAgICAnMjAwJzoKICAgICAgICAgIGRlc2NyaXB0aW9uOiBPSwogICAgICAgICAgY29udGVudDoKICAgICAgICAgICAgdGV4dC9wbGFpbjoKICAgICAgICAgICAgICBzY2hlbWE6CiAgICAgICAgICAgICAgICB0eXBlOiBzdHJpbmcKICAvYXBpL2xvY2F0aW9uczoKICAgIGdldDoKICAgICAgc3VtbWFyeTogTGlzdCBsb2NhdGlvbnMKICAgICAgcmVzcG9uc2VzOgogICAgICAgICcyMDAnOgogICAgICAgICAgZGVzY3JpcHRpb246IE9LCiAgICAgICAgICBjb250ZW50OgogICAgICAgICAgICBhcHBsaWNhdGlvbi9qc29uOgogICAgICAgICAgICAgIHNjaGVtYToKICAgICAgICAgICAgICAgIHR5cGU6IGFycmF5CiAgICAgICAgICAgICAgICBpdGVtczoKICAgICAgICAgICAgICAgICAgdHlwZTogb2JqZWN0CiAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6CiAgICAgICAgICAgICAgICAgICAgaWQ6IHsgdHlwZTogc3RyaW5nIH0KICAgICAgICAgICAgICAgICAgICBuYW1lOiB7IHR5cGU6IHN0cmluZyB9CiAgICAgICAgICAgICAgICAgICAgYWRkcmVzczogeyB0eXBlOiBzdHJpbmcgfQogICAgICAgICAgICAgICAgICAgIGNpdHk6IHsgdHlwZTogc3RyaW5nIH0KICAgICAgICAgICAgICAgICAgICBjYXBhY2l0eTogeyB0eXBlOiBpbnRlZ2VyIH0KICAvYXBpL2Jvb2tpbmc6CiAgICBnZXQ6CiAgICAgIHN1bW1hcnk6IExpc3QgYm9va2luZ3MKICAgICAgcmVzcG9uc2VzOgogICAgICAgICcyMDAnOgogICAgICAgICAgZGVzY3JpcHRpb246IE9LCiAgICAgICAgICBjb250ZW50OgogICAgICAgICAgICBhcHBsaWNhdGlvbi9qc29uOgogICAgICAgICAgICAgIHNjaGVtYToKICAgICAgICAgICAgICAgIHR5cGU6IGFycmF5CiAgICAgICAgICAgICAgICBpdGVtczoKICAgICAgICAgICAgICAgICAgdHlwZTogb2JqZWN0CiAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6CiAgICAgICAgICAgICAgICAgICAgaWQ6IHsgdHlwZTogaW50ZWdlciB9CiAgICAgICAgICAgICAgICAgICAgdXNlcklkOiB7IHR5cGU6IGludGVnZXIgfQogICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uSWQ6IHsgdHlwZTogc3RyaW5nIH0KICAgICAgICAgICAgICAgICAgICBzdGFydEF0OiB7IHR5cGU6IHN0cmluZywgZm9ybWF0OiBkYXRlLXRpbWUgfQogICAgICAgICAgICAgICAgICAgIGVuZEF0OiB7IHR5cGU6IHN0cmluZywgZm9ybWF0OiBkYXRlLXRpbWUgfQogICAgICAgICAgICAgICAgICAgIHN0YXR1czogeyB0eXBlOiBzdHJpbmcsIGVudW06IFtjb25maXJtZWQsIHBlbmRpbmcsIGNhbmNlbGxlZF0gfQo=' ; [IO.File]::WriteAllBytes($env:TEMP+'\cowork_swagger\openapi.yaml',[Convert]::FromBase64String($b))"
powershell -NoProfile -Command "$b='PCFkb2N0eXBlIGh0bWw+PGh0bWwgbGFuZz0iaXQiPjxoZWFkPjxtZXRhIGNoYXJzZXQ9InV0Zi04IiAvPgo8dGl0bGU+Q29Xb3JrU3BhY2UgQVBJIOKAkyBTd2FnZ2VyPC90aXRsZT4KPG1ldGEgbmFtZT0idmlld3BvcnQiIGNvbnRlbnQ9IndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xIiAvPgo8bGluayByZWw9InN0eWxlc2hlZXQiIGhyZWY9Imh0dHBzOi8vdW5wa2cuY29tL3N3YWdnZXItdWktZGlzdC9zd2FnZ2VyLXVpLmNzcyIgLz48L2hlYWQ+Cjxib2R5PjxkaXYgaWQ9InN3YWdnZXItdWkiPjwvZGl2Pgo8c2NyaXB0IHNyYz0iaHR0cHM6Ly91bnBrZy5jb20vc3dhZ2dlci11aS1kaXN0L3N3YWdnZXItdWktYnVuZGxlLmpzIj48L3NjcmlwdD4KPHNjcmlwdD53aW5kb3cudWkgPSBTd2FnZ2VyVUlCdW5kbGUoeyB1cmw6ICIvb3BlbmFwaS9vcGVuYXBpLnlhbWw/dj04IiwgZG9tX2lkOiAiI3N3YWdnZXItdWkiIH0pOzwvc2NyaXB0Pgo8L2JvZHk+PC9odG1sPg==' ; [IO.File]::WriteAllBytes($env:TEMP+'\cowork_swagger\swagger-ui\index.html',[Convert]::FromBase64String($b))"
powershell -NoProfile -Command "$b='c2VydmVyIHsKICBsaXN0ZW4gODA7CiAgc2VydmVyX25hbWUgbG9jYWxob3N0OwoKICBsb2NhdGlvbiAvb3BlbmFwaS8gewogICAgcm9vdCAvdXNyL3NoYXJlL25naW54L2h0bWw7CiAgICBkZWZhdWx0X3R5cGUgYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtOwogIH0KCiAgbG9jYXRpb24gPSAvIHsgcmV0dXJuIDMwMiAvb3BlbmFwaS9zd2FnZ2VyLXVpLzsgfQoKICBsb2NhdGlvbiA9IC9hcGkvaGVhbHRoIHsKICAgIGRlZmF1bHRfdHlwZSB0ZXh0L3BsYWluOwogICAgcmV0dXJuIDIwMCAiT0tcbiI7CiAgfQoKICBsb2NhdGlvbiA9IC9hcGkvbG9jYXRpb25zIHsKICAgIGRlZmF1bHRfdHlwZSBhcHBsaWNhdGlvbi9qc29uOwogICAgYWxpYXMgL3Vzci9zaGFyZS9uZ2lueC9odG1sL21vY2svbG9jYXRpb25zLmpzb247CiAgfQoKICBsb2NhdGlvbiA9IC9hcGkvYm9va2luZyB7CiAgICBkZWZhdWx0X3R5cGUgYXBwbGljYXRpb24vanNvbjsKICAgIGFsaWFzIC91c3Ivc2hhcmUvbmdpbngvaHRtbC9tb2NrL2Jvb2tpbmcuanNvbjsKICB9Cn0K' ; [IO.File]::WriteAllBytes($env:TEMP+'\cowork_swagger\nginx.conf',[Convert]::FromBase64String($b))"
powershell -NoProfile -Command "$b='WwogIHsKICAgICJpZCI6ICJNSS1DRU4iLAogICAgIm5hbWUiOiAiTWlsYW5vIC0gQ2VudHJhbGUiLAogICAgImFkZHJlc3MiOiAiVmlhIFZpdHRvcmlvIFZlbmV0byAxMiIsCiAgICAiY2l0eSI6ICJNaWxhbm8iLAogICAgImNhcGFjaXR5IjogMTIwCiAgfSwKICB7CiAgICAiaWQiOiAiUk0tRVVSIiwKICAgICJuYW1lIjogIlJvbWEgLSBFVVIiLAogICAgImFkZHJlc3MiOiAiVmlhbGUgRXVyb3BhIDg4IiwKICAgICJjaXR5IjogIlJvbWEiLAogICAgImNhcGFjaXR5IjogOTUKICB9LAogIHsKICAgICJpZCI6ICJUTy1QT1IiLAogICAgIm5hbWUiOiAiVG9yaW5vIC0gUG9ydGEgTnVvdmEiLAogICAgImFkZHJlc3MiOiAiQ29yc28gVml0dG9yaW8gRW1hbnVlbGUgSUkgMzEiLAogICAgImNpdHkiOiAiVG9yaW5vIiwKICAgICJjYXBhY2l0eSI6IDYwCiAgfSwKICB7CiAgICAiaWQiOiAiRkktQ0VOIiwKICAgICJuYW1lIjogIkZpcmVuemUgLSBDZW50cm8iLAogICAgImFkZHJlc3MiOiAiVmlhIGRlaSBDYWx6YWl1b2xpIDUiLAogICAgImNpdHkiOiAiRmlyZW56ZSIsCiAgICAiY2FwYWNpdHkiOiA1NQogIH0KXQ==' ; [IO.File]::WriteAllBytes($env:TEMP+'\cowork_swagger\mock\locations.json',[Convert]::FromBase64String($b))"
powershell -NoProfile -Command "$b='WwogIHsKICAgICJpZCI6IDYwMDAsCiAgICAidXNlcklkIjogMSwKICAgICJsb2NhdGlvbklkIjogIkZJLUNFTiIsCiAgICAic3RhcnRBdCI6ICIyMDI1LTA5LTE1VDA4OjAwOjAwWiIsCiAgICAiZW5kQXQiOiAiMjAyNS0wOS0xNVQxMTowMDowMFoiLAogICAgInN0YXR1cyI6ICJjYW5jZWxsZWQiCiAgfSwKICB7CiAgICAiaWQiOiA2MDAxLAogICAgInVzZXJJZCI6IDIsCiAgICAibG9jYXRpb25JZCI6ICJGSS1DRU4iLAogICAgInN0YXJ0QXQiOiAiMjAyNS0wOS0xNVQxMTowMDowMFoiLAogICAgImVuZEF0IjogIjIwMjUtMDktMTVUMTQ6MDA6MDBaIiwKICAgICJzdGF0dXMiOiAiY2FuY2VsbGVkIgogIH0sCiAgewogICAgImlkIjogNjAwMiwKICAgICJ1c2VySWQiOiAzLAogICAgImxvY2F0aW9uSWQiOiAiTUktQ0VOIiwKICAgICJzdGFydEF0IjogIjIwMjUtMDktMTVUMTQ6MDA6MDBaIiwKICAgICJlbmRBdCI6ICIyMDI1LTA5LTE1VDE3OjAwOjAwWiIsCiAgICAic3RhdHVzIjogImNhbmNlbGxlZCIKICB9LAogIHsKICAgICJpZCI6IDYwMDMsCiAgICAidXNlcklkIjogNCwKICAgICJsb2NhdGlvbklkIjogIkZJLUNFTiIsCiAgICAic3RhcnRBdCI6ICIyMDI1LTA5LTE2VDA4OjAwOjAwWiIsCiAgICAiZW5kQXQiOiAiMjAyNS0wOS0xNlQxMTowMDowMFoiLAogICAgInN0YXR1cyI6ICJjYW5jZWxsZWQiCiAgfSwKICB7CiAgICAiaWQiOiA2MDA0LAogICAgInVzZXJJZCI6IDUsCiAgICAibG9jYXRpb25JZCI6ICJUTy1QT1IiLAogICAgInN0YXJ0QXQiOiAiMjAyNS0wOS0xNlQxMTowMDowMFoiLAogICAgImVuZEF0IjogIjIwMjUtMDktMTZUMTQ6MDA6MDBaIiwKICAgICJzdGF0dXMiOiAiY2FuY2VsbGVkIgogIH0sCiAgewogICAgImlkIjogNjAwNSwKICAgICJ1c2VySWQiOiA2LAogICAgImxvY2F0aW9uSWQiOiAiVE8tUE9SIiwKICAgICJzdGFydEF0IjogIjIwMjUtMDktMTZUMTQ6MDA6MDBaIiwKICAgICJlbmRBdCI6ICIyMDI1LTA5LTE2VDE3OjAwOjAwWiIsCiAgICAic3RhdHVzIjogInBlbmRpbmciCiAgfSwKICB7CiAgICAiaWQiOiA2MDA2LAogICAgInVzZXJJZCI6IDcsCiAgICAibG9jYXRpb25JZCI6ICJUTy1QT1IiLAogICAgInN0YXJ0QXQiOiAiMjAyNS0wOS0xN1QwODowMDowMFoiLAogICAgImVuZEF0IjogIjIwMjUtMDktMTdUMTE6MDA6MDBaIiwKICAgICJzdGF0dXMiOiAicGVuZGluZyIKICB9LAogIHsKICAgICJpZCI6IDYwMDcsCiAgICAidXNlcklkIjogOCwKICAgICJsb2NhdGlvbklkIjogIlRPLVBPUiIsCiAgICAic3RhcnRBdCI6ICIyMDI1LTA5LTE3VDExOjAwOjAwWiIsCiAgICAiZW5kQXQiOiAiMjAyNS0wOS0xN1QxNDowMDowMFoiLAogICAgInN0YXR1cyI6ICJjb25maXJtZWQiCiAgfSwKICB7CiAgICAiaWQiOiA2MDA4LAogICAgInVzZXJJZCI6IDksCiAgICAibG9jYXRpb25JZCI6ICJUTy1QT1IiLAogICAgInN0YXJ0QXQiOiAiMjAyNS0wOS0xN1QxNDowMDowMFoiLAogICAgImVuZEF0IjogIjIwMjUtMDktMTdUMTc6MDA6MDBaIiwKICAgICJzdGF0dXMiOiAicGVuZGluZyIKICB9LAogIHsKICAgICJpZCI6IDYwMDksCiAgICAidXNlcklkIjogMTAsCiAgICAibG9jYXRpb25JZCI6ICJUTy1QT1IiLAogICAgInN0YXJ0QXQiOiAiMjAyNS0wOS0xOFQwODowMDowMFoiLAogICAgImVuZEF0IjogIjIwMjUtMDktMThUMTE6MDA6MDBaIiwKICAgICJzdGF0dXMiOiAiY2FuY2VsbGVkIgogIH0sCiAgewogICAgImlkIjogNjAxMCwKICAgICJ1c2VySWQiOiAxLAogICAgImxvY2F0aW9uSWQiOiAiTUktQ0VOIiwKICAgICJzdGFydEF0IjogIjIwMjUtMDktMThUMTE6MDA6MDBaIiwKICAgICJlbmRBdCI6ICIyMDI1LTA5LTE4VDE0OjAwOjAwWiIsCiAgICAic3RhdHVzIjogImNhbmNlbGxlZCIKICB9LAogIHsKICAgICJpZCI6IDYwMTEsCiAgICAidXNlcklkIjogMiwKICAgICJsb2NhdGlvbklkIjogIkZJLUNFTiIsCiAgICAic3RhcnRBdCI6ICIyMDI1LTA5LTE4VDE0OjAwOjAwWiIsCiAgICAiZW5kQXQiOiAiMjAyNS0wOS0xOFQxNzowMDowMFoiLAogICAgInN0YXR1cyI6ICJwZW5kaW5nIgogIH0sCiAgewogICAgImlkIjogNjAxMiwKICAgICJ1c2VySWQiOiAzLAogICAgImxvY2F0aW9uSWQiOiAiRkktQ0VOIiwKICAgICJzdGFydEF0IjogIjIwMjUtMDktMTlUMDg6MDA6MDBaIiwKICAgICJlbmRBdCI6ICIyMDI1LTA5LTE5VDExOjAwOjAwWiIsCiAgICAic3RhdHVzIjogImNvbmZpcm1lZCIKICB9LAogIHsKICAgICJpZCI6IDYwMTMsCiAgICAidXNlcklkIjogNCwKICAgICJsb2NhdGlvbklkIjogIlJNLUVVUiIsCiAgICAic3RhcnRBdCI6ICIyMDI1LTA5LTE5VDExOjAwOjAwWiIsCiAgICAiZW5kQXQiOiAiMjAyNS0wOS0xOVQxNDowMDowMFoiLAogICAgInN0YXR1cyI6ICJjYW5jZWxsZWQiCiAgfSwKICB7CiAgICAiaWQiOiA2MDE0LAogICAgInVzZXJJZCI6IDUsCiAgICAibG9jYXRpb25JZCI6ICJGSS1DRU4iLAogICAgInN0YXJ0QXQiOiAiMjAyNS0wOS0xOVQxNDowMDowMFoiLAogICAgImVuZEF0IjogIjIwMjUtMDktMTlUMTc6MDA6MDBaIiwKICAgICJzdGF0dXMiOiAiY29uZmlybWVkIgogIH0sCiAgewogICAgImlkIjogNjAxNSwKICAgICJ1c2VySWQiOiA2LAogICAgImxvY2F0aW9uSWQiOiAiVE8tUE9SIiwKICAgICJzdGFydEF0IjogIjIwMjUtMDktMjBUMDg6MDA6MDBaIiwKICAgICJlbmRBdCI6ICIyMDI1LTA5LTIwVDExOjAwOjAwWiIsCiAgICAic3RhdHVzIjogInBlbmRpbmciCiAgfSwKICB7CiAgICAiaWQiOiA2MDE2LAogICAgInVzZXJJZCI6IDcsCiAgICAibG9jYXRpb25JZCI6ICJUTy1QT1IiLAogICAgInN0YXJ0QXQiOiAiMjAyNS0wOS0yMFQxMTowMDowMFoiLAogICAgImVuZEF0IjogIjIwMjUtMDktMjBUMTQ6MDA6MDBaIiwKICAgICJzdGF0dXMiOiAiY2FuY2VsbGVkIgogIH0sCiAgewogICAgImlkIjogNjAxNywKICAgICJ1c2VySWQiOiA4LAogICAgImxvY2F0aW9uSWQiOiAiTUktQ0VOIiwKICAgICJzdGFydEF0IjogIjIwMjUtMDktMjBUMTQ6MDA6MDBaIiwKICAgICJlbmRBdCI6ICIyMDI1LTA5LTIwVDE3OjAwOjAwWiIsCiAgICAic3RhdHVzIjogImNhbmNlbGxlZCIKICB9LAogIHsKICAgICJpZCI6IDYwMTgsCiAgICAidXNlcklkIjogOSwKICAgICJsb2NhdGlvbklkIjogIlRPLVBPUiIsCiAgICAic3RhcnRBdCI6ICIyMDI1LTA5LTIxVDA4OjAwOjAwWiIsCiAgICAiZW5kQXQiOiAiMjAyNS0wOS0yMVQxMTowMDowMFoiLAogICAgInN0YXR1cyI6ICJjYW5jZWxsZWQiCiAgfSwKICB7CiAgICAiaWQiOiA2MDE5LAogICAgInVzZXJJZCI6IDEwLAogICAgImxvY2F0aW9uSWQiOiAiUk0tRVVSIiwKICAgICJzdGFydEF0IjogIjIwMjUtMDktMjFUMTE6MDA6MDBaIiwKICAgICJlbmRBdCI6ICIyMDI1LTA5LTIxVDE0OjAwOjAwWiIsCiAgICAic3RhdHVzIjogImNhbmNlbGxlZCIKICB9Cl0=' ; [IO.File]::WriteAllBytes($env:TEMP+'\cowork_swagger\mock\booking.json',[Convert]::FromBase64String($b))"

powershell -NoProfile -Command "$ErrorActionPreference='SilentlyContinue';  $ErrorActionPreference='SilentlyContinue' $hostUrl = `"http://localhost:4000`" function Try-Fetch($path, $outFile) {   try {     $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 -Uri ($hostUrl + $path)     if ($r.StatusCode -eq 200 -and $r.Content.Length -gt 0) {       $dir = Split-Path -Parent $outFile       if (!(Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }       Set-Content -Encoding UTF8 -Path $outFile -Value $r.Content       Write-Host `"[HYDRATE] $path -> $outFile (OK)`"       return $true     }   } catch {}   return $false } $okLoc = Try-Fetch `"/api/locations`" `"$env:TEMP\cowork_swagger\mock\locations.json`" $okBoo = Try-Fetch `"/api/booking`"   `"$env:TEMP\cowork_swagger\mock\booking.json`" if (-not $okLoc) { Write-Host `"[HYDRATE] locations.json fallback in uso`" } if (-not $okBoo) { Write-Host `"[HYDRATE] booking.json fallback in uso`" } "

docker run -d --name "%SW_CONT%" -p 9090:80 ^
  -v "%SW_TMP%":/usr/share/nginx/html/openapi:ro ^
  -v "%SW_TMP%\mock":/usr/share/nginx/html/mock:ro ^
  -v "%SW_TMP%\nginx.conf":/etc/nginx/conf.d/default.conf:ro ^
  nginx:alpine >nul

set "__ok=0"
for /L %%I in (1,1,10) do (
  powershell -NoProfile -Command "try{(Invoke-WebRequest -UseBasicParsing http://localhost:9090/openapi/swagger-ui/ -TimeoutSec 1)|Out-Null; exit 0}catch{exit 1}" >nul 2>&1
  if not errorlevel 1 ( set "__ok=1" & goto :SW_OK )
  ping -n 2 127.0.0.1 > nul
)
:SW_OK
if "%__ok%"=="0" (
  echo [ERROR] Swagger non raggiungibile. Log:
  docker logs --tail 80 "%SW_CONT%"
) else (
  echo Swagger UI: http://localhost:9090/openapi/swagger-ui/  (OK)
  echo Endpoint di test:
  echo   GET http://localhost:9090/api/health
  echo   GET http://localhost:9090/api/locations
  echo   GET http://localhost:9090/api/booking
)
REM ===== END SWAGGER =====

