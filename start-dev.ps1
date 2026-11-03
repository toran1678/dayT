param(
    [switch]$InfraOnly
)

$ErrorActionPreference = "Stop"
$RootDir = $PSScriptRoot
Set-Location $RootDir

function Get-EnvValue([string]$Key, [string]$DefaultValue) {
    $EnvFile = Join-Path $RootDir ".env"
    if (Test-Path $EnvFile) {
        foreach ($rawLine in Get-Content $EnvFile) {
            $line = $rawLine.Trim()
            if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith("#")) { continue }
            $parts = $line -split "=", 2
            if ($parts.Length -eq 2 -and $parts[0].Trim() -eq $Key) {
                $val = $parts[1].Trim().Trim('"').Trim("'")
                if (-not [string]::IsNullOrWhiteSpace($val)) { return $val }
            }
        }
    }
    return $DefaultValue
}

$BackendPort = Get-EnvValue "SERVER_PORT" "8080"
$AiPort      = Get-EnvValue "AI_SERVER_PORT" "8000"

Write-Host "`n=======================================================" -ForegroundColor DarkGreen
Write-Host "  DayT 로컬 통합 개발 환경 실행기 (Infra + Backend + AI + Web)" -ForegroundColor Green
Write-Host "=======================================================`n" -ForegroundColor DarkGreen

Write-Host "[1/4] Docker 인프라(PostGIS + Redis) 컨테이너 실행 중..." -ForegroundColor Cyan
docker compose up -d

if ($InfraOnly) {
    Write-Host "`n인프라 컨테이너만 기동되었습니다. (종료: docker compose stop)" -ForegroundColor Green
    exit 0
}

Write-Host "[2/4] Spring Boot 백엔드 새 창 실행 (Port: $BackendPort)..." -ForegroundColor Cyan
Start-Process powershell -WorkingDirectory (Join-Path $RootDir "backend") -ArgumentList @(
    "-NoExit",
    "-Command",
    "`$Host.UI.RawUI.WindowTitle = 'DayT - Backend ($BackendPort)'; .\gradlew.bat bootRun"
)

Write-Host "[3/4] FastAPI AI 서비스(.venv) 새 창 실행 (Port: $AiPort)..." -ForegroundColor Cyan
$VenvPython = Join-Path $RootDir "ai-service\.venv\Scripts\python.exe"
if (-not (Test-Path $VenvPython)) {
    Write-Warning "ai-service\.venv 가상환경을 찾을 수 없습니다. 'ai-service/README.md' 안내에 따라 먼저 .venv를 생성해주세요."
} else {
    Start-Process powershell -WorkingDirectory (Join-Path $RootDir "ai-service") -ArgumentList @(
        "-NoExit",
        "-Command",
        "`$Host.UI.RawUI.WindowTitle = 'DayT - AI Service ($AiPort)'; .\.venv\Scripts\python.exe -m app.main"
    )
}

Write-Host "[4/4] Next.js 반응형 웹 프론트엔드 새 창 실행 (Port: 3000)..." -ForegroundColor Cyan
Start-Process powershell -WorkingDirectory (Join-Path $RootDir "web") -ArgumentList @(
    "-NoExit",
    "-Command",
    "`$Host.UI.RawUI.WindowTitle = 'DayT - Web (3000)'; npm run dev"
)

Write-Host "`n모든 서비스 기동 명령이 전달되었습니다!" -ForegroundColor Green
Write-Host "  - Web App       : http://localhost:3000"
Write-Host "  - Backend Docs  : http://localhost:$BackendPort/docs"
Write-Host "  - AI Docs       : http://localhost:$AiPort/docs"
Write-Host "  - DB / Redis    : localhost:5432 (PostGIS) / localhost:6379 (Redis)`n"

