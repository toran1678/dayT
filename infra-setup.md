# DayT 로컬 인프라 & 서비스별 실행 가이드

> 전체 서비스를 한 번에 실행할 수도 있고, 디버깅·개발 상황에 맞춰 **인프라(`PostGIS` + `Redis`), `backend`, `ai-service`, `web`** 을 개별 실행할 수도 있습니다.

---

## 0. 사전 준비 (최초 1회)

1. **루트 `.env` 파일 생성**
   ```powershell
   Copy-Item .env.example .env
   ```
   > **Windows 포트 참고**: Windows(`WinNAT` 예약 포트 대역)에서 기본 `8080`·`8000` 포트 바인딩 권한 오류가 발생하는 경우, `.env`에서 `SERVER_PORT=18080`, `AI_SERVER_PORT=18000`, `AI_SERVICE_BASE_URL=http://localhost:18000`, `NEXT_PUBLIC_API_BASE_URL=http://localhost:18080`으로 설정해 사용합니다.

2. **기존 `5432` 포트 점유 컨테이너 확인 (필요 시)**
   ```powershell
   docker stop my-postgres
   ```

---

## 1. 한 번에 전체 실행하기 (통합 런처)

프로젝트 루트(`C:\Workspace\01_Projects\DayT`)에서 실행합니다.

```powershell
# Docker(DB+Redis) + Backend + AI Service + Web 전체 기동
.\start-dev.ps1

# Docker 인프라(DB+Redis)만 기동
.\start-dev.ps1 -InfraOnly
```

- **에디터 내장 터미널 탭 실행**: `Ctrl + Shift + P` → `Tasks: Run Task` → **`DayT: Start All Services`**

---

## 2. 서비스별 개별 실행 & 테스트 방법

### ① DB + Redis (`docker-compose.yml`)
프로젝트 루트에서 실행합니다.

```powershell
# 백그라운드 기동 및 상태 확인
docker compose up -d
docker compose ps

# 정상 동작 검증 (PostGIS 버전 & Redis PONG)
docker exec dayt-postgres psql -U dayt -d dayt -c "SELECT PostGIS_Version();"
docker exec dayt-redis redis-cli ping

# 중지 (데이터 볼륨 유지)
docker compose down
```

| 구분 | 컨테이너명 | Host:Port | DB / 비고 | 계정 (`User` / `Password`) |
| :--- | :--- | :---: | :--- | :--- |
| **PostgreSQL + PostGIS** | `dayt-postgres` | `localhost:5432` | `dayt` (`postgis` 확장) | `dayt` / `dayt1234` |
| **Redis** | `dayt-redis` | `localhost:6379` | AOF 영속화 활성화 | 비밀번호 없음 (로컬 개발용) |

---

### ② Spring Boot 백엔드 (`backend/`)
> 실행 전 **① DB + Redis** 컨테이너가 켜져 있어야 Flyway 마이그레이션과 JPA 연결이 정상 동작합니다.

```powershell
cd backend

# 서버 실행 (루트 ../.env의 SERVER_PORT 자동 반영)
.\gradlew.bat bootRun

# 전체 테스트 실행
.\gradlew.bat test
```
- **Swagger UI 접속**: `http://localhost:8080/docs` *(포트 변경 시 예: `http://localhost:18080/docs`)*

---

### ③ FastAPI AI 서비스 (`ai-service/`)

```powershell
cd ai-service

# (최초 1회) 가상환경 생성 및 패키지 설치
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt

# 서버 실행 방법 A — 루트 ../.env의 AI_SERVER_PORT 자동 적용 (권장)
.\.venv\Scripts\python.exe -m app.main

# 서버 실행 방법 B — uvicorn CLI 직접 지정 (포트 명시 필수)
.\.venv\Scripts\uvicorn app.main:app --reload --port 18000

# 테스트 실행
.\.venv\Scripts\pytest
```
- **Swagger UI 접속**: `http://localhost:8000/docs` *(포트 변경 시 예: `http://localhost:18000/docs`)*

---

### ④ Next.js 반응형 웹 (`web/`)

```powershell
cd web

# (최초 1회) 패키지 설치
npm install

# 개발 서버 실행 (http://localhost:3000)
npm run dev

# OpenAPI 명세(docs/api-spec.yaml) 변경 시 TS 타입 재생성
npm run gen:api

# 타입 검사 및 린트 검증
npm run typecheck
npm run lint
```
- **브라우저 접속**: `http://localhost:3000`
