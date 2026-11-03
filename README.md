# DayT — 하루 전체를 책임지는 올인원 데이트 코스 플랫폼

맛집·카페·전시·놀거리 반경 탐색부터 예산 맞춤 메뉴 추천, Gemini 기반 AI 데이트 코스 설계, 실시간 공동 편집, 커플 캐릭터 성장(Grow Together) 및 데이트 일기장까지 한곳에서 연결하는 멀티 서비스 모노레포입니다.

---

## 1. 서비스 아키텍처 구성

| 디렉터리 | 역할 | 핵심 기술 스택 |
| :--- | :--- | :--- |
| **`web/`** | 주력 클라이언트 (데스크톱 대시보드 + 모바일 반응형 웹) | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, `openapi-typescript` |
| **`backend/`** | 메인 API · 인증 · 공간 검색 · 실시간 협업 서버 | Java 21, Spring Boot 4.1, JPA + Hibernate Spatial(PostGIS), Flyway, Security/JWT, STOMP |
| **`ai-service/`** | 내부 전용 AI 추천 · 장소 리뷰 요약 마이크로서비스 | Python 3.12 (`venv`), FastAPI, Pydantic v2, `google-genai` (`gemini-3.8-flash`) |
| **`mobile/`** | *(Phase 5 추후 확장)* 모바일 네이티브 앱 | Expo (React Native), TypeScript |
| **`docs/`** | 단일 진실 공급원 (SSoT) 설계 명세 | `prd.md`, `erd.md`, `api-spec.yaml` |

---

## 2. 빠른 시작 (통합 실행 가이드)

### 사전 준비 (최초 1회)
1. 루트 `.env.example`을 복사해 `.env` 파일을 생성하고 API 키 및 포트(`SERVER_PORT`, `AI_SERVER_PORT` 등)를 설정합니다.
2. Docker Desktop이 실행 중인지 확인합니다. (상세 인프라 설정은 [infra-setup.md](./infra-setup.md) 참고)
3. `ai-service/` 가상환경(`.venv`) 및 `web/` 의존성(`npm install`)을 설치합니다.

### 방법 A: 원클릭 PowerShell 스크립트 실행 (권장)
프로젝트 루트에서 아래 명령어 한 줄로 Docker 인프라(`PostGIS`, `Redis`)와 3개 서버(`backend`, `ai-service`, `web`)를 한 번에 실행합니다.

```powershell
.\start-dev.ps1
```

- 인프라(DB·Redis)만 먼저 띄우고 싶을 때: `.\start-dev.ps1 -InfraOnly`

### 방법 B: 에디터 내장 터미널 탭으로 한 번에 실행 (VS Code / Antigravity)
1. `Ctrl + Shift + P` → **`Tasks: Run Task`** 선택
2. **`DayT: Start All Services`** 클릭 시 에디터 하단 분할 터미널 탭에서 4개 작업이 동시에 실행됩니다.

---

## 3. 주요 문서 바로가기

- **기획 요구사항 (PRD)**: [docs/prd.md](./docs/prd.md)
- **데이터베이스 설계 (PostGIS ERD)**: [docs/erd.md](./docs/erd.md)
- **단일 API 계약 명세 (OpenAPI 3.0)**: [docs/api-spec.yaml](./docs/api-spec.yaml)
- **구현 계획서**: [implementation_plan.md](./implementation_plan.md)
- **진행 현황 & 작업 로그**: [progress.md](./progress.md)
