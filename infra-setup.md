# DayT 로컬 인프라 설정 가이드 (`PostGIS` + `Redis`)

> [docs/erd.md](./docs/erd.md) 설계 기준에 맞춰 **PostgreSQL 16 (`PostGIS` 공간 확장 포함)** 과 **Redis 7** 을 `docker-compose.yml`로 통합 실행합니다.

---

## 1. 사전 준비

1. **환경 변수 파일(`.env`) 생성** (선택 — 생략 시 `docker-compose.yml` 기본값으로 동작)
   ```powershell
   Copy-Item .env.example .env
   ```

2. **(기존 단일 컨테이너 사용 시) `5432` 포트 충돌 방지**
   이전에 `my-postgres` 등 `5432` 포트를 점유 중인 컨테이너가 실행 중이라면 먼저 중지합니다.
   ```powershell
   docker stop my-postgres
   ```

---

## 2. 컨테이너 실행 및 종료

```powershell
# 백그라운드 실행 (PostGIS + Redis 동시 기동)
docker compose up -d

# 실행 상태 및 Healthcheck 확인
docker compose ps

# 중지 (데이터 볼륨 유지)
docker compose down
```

---

## 3. 정상 동작 검증 명령어

```powershell
# 1) PostgreSQL + PostGIS 확장 버전 확인
docker exec dayt-postgres psql -U dayt -d dayt -c "SELECT PostGIS_Version();"

# 2) Redis 응답 확인 (PONG 출력 시 정상)
docker exec dayt-redis redis-cli ping
```

---

## 4. 로컬 접속 정보 (기본값)

| 구분 | 컨테이너명 | Host | Port | Database / 비고 | 계정 (`User` / `Password`) |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **PostgreSQL + PostGIS** | `dayt-postgres` | `localhost` | `5432` | `dayt` (`postgis` 활성화) | `dayt` / `dayt1234` |
| **Redis** | `dayt-redis` | `localhost` | `6379` | AOF 영속화 활성화 | 비밀번호 없음 (로컬 개발용) |
