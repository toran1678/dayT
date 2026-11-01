# 로컬 인프라 및 DB 설정

## 1. PostgreSQL (Docker)

- **컨테이너 실행 명령어:**

```bash
docker run --name my-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=1234 \
  -e POSTGRES_DB=mydb \
  -p 5432:5432 \
  -d postgres:15
```

- **접속 정보:**
    - Host: `localhost`
    - Port: `5432`
    - User: `postgres`
    - Password: `1234`
    - Database: `mydb`

```bash
# 정상 실행 여부 확인
docker ps
```

