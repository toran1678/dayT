# DayT 진행 상태 및 작업 로그 (Progress & Tasks)

> 별도의 `tasks.md`를 두지 않고, 이 문서에서 **전체 할 일 체크리스트**와 **작업 이력**을 단일 관리합니다.  
> 상태 표기: `[x]` 완료 · `[-]` 진행 중 · `[ ]` 대기

---

## 1. 현재 포커스 (Current Focus)
- **현재 단계**: **`Phase 1 (로컬 인프라 & 프로젝트 스캐폴딩)` 진행 중 (3/4 완료)**
- **다음 우선 작업**: `mobile/` Expo (React Native + TS + Expo Router) 초기화 및 `openapi-typescript` 타입 생성 연결

---

## 2. 단계별 체크리스트 (Task Checklist)

### Phase 0: 기획 · 설계 · 에이전트 하네스
- [x] 멀티 서비스 폴더 구조 초기화 (`mobile/`, `web/`, `backend/`, `ai-service/`, `docs/`)
- [x] 제품 요구사항 정의서 확정 (`docs/prd.md`)
- [x] PostgreSQL + PostGIS 데이터베이스 ERD 설계 확정 (`docs/erd.md`)
- [x] 단일 기준 API 명세서 작성 완료 (`docs/api-spec.yaml`)
- [x] 에이전트 명세 보호 훅 및 워크플로우 규칙 구축 (`.agents/`)

### Phase 1: 로컬 인프라 & 프로젝트 스캐폴딩
- [x] 루트 `docker-compose.yml` (PostgreSQL 16 + `PostGIS`, `Redis`) 및 `.env.example` 구성
- [x] `backend/` Spring Boot 초기화 (JPA + Hibernate Spatial, Security/JWT, 공통 `ErrorResponse`)
- [x] `ai-service/` FastAPI 초기화 (Gemini 연동 구조, Pydantic `camelCase` 직렬화 기반)
- [ ] `mobile/` Expo (React Native + TS + Expo Router) 초기화 및 `openapi-typescript` 타입 생성 연결

### Phase 2: P0 핵심 MVP 구현 (`F-01` ~ `F-05`)
- [ ] **[F-01] 인증/회원**: 카카오·구글 OAuth 로그인, JWT 발급/갱신, 내 정보 조회·수정 (`/api/v1/auth/*`, `/api/v1/users/me`)
- [ ] **[F-02] 장소 탐색**: 역·동네 기반 주변 장소 PostGIS 반경 조회, 카카오 로컬 연동 및 Redis 캐싱 (`/api/v1/places`)
- [ ] **[F-03] 음식 추천**: 음식 대분류·세부 메뉴·예산 조건 기반 식당 추천 (`/api/v1/places/foods/recommend`)
- [ ] **[F-04] 코스 메이커**: 장소 순서 배치, 예상 비용·이동/소요 시간 자동 계산, 코스 CRUD (`/api/v1/courses`)
- [ ] **[F-05] 지도 동선 시각화**: `react-native-maps` 커스텀 테마, 순서 마커 및 이동 경로 폴리라인 렌더링

### Phase 3: P1 AI · 데이터 · 공유 고도화 (`F-06` ~ `F-10`)
- [ ] **[F-07·08] 데이터 수집 & AI 요약**: TourAPI·공공데이터·블로그 후기 수집 및 Gemini 해시태그 추출 (`/internal/ai/v1/places/enrich`)
- [ ] **[F-06] AI 맞춤 코스 추천**: 후보 장소 필터링(`backend`) + Gemini 최적 동선 조합 (`/api/v1/courses/recommend`)
- [ ] **[F-09] 코스 공유**: 공유 토큰 발급 및 카카오톡 Open Graph 썸네일 링크 공유
- [ ] **[F-10] 원클릭 길안내**: 완성 코스 경유지 포함 Google Maps Deep Link 연동

### Phase 4: P2 실시간 협업 · 웹 · 커플 리텐션 (`F-11` ~ `F-14`)
- [ ] **[F-11] KML Export**: 구글 '내 지도(My Maps)' 임포트용 KML 다운로드 (`/api/v1/courses/{courseId}/export.kml`)
- [ ] **[F-12] 웹 공유 뷰어 (`web/`)**: Next.js 기반 공유 페이지 및 Google Maps 커스텀 스타일 렌더링
- [ ] **[F-13] 실시간 공동 편집**: STOMP WebSocket(`/ws/collab`) 기반 동시 장소 추가·삭제·순서 변경
- [ ] **[F-14] Grow Together & 일기장**: 커플 연결, 펫 성장·일일 미션, 데이트 일기장 CRUD

---

## 3. 작업 완료 로그 (Changelog)

### 2026-11-01
- **기획·설계 문서 확립**: `docs/prd.md`, `docs/erd.md`(PostGIS/JSONB), `docs/api-spec.yaml`(OpenAPI 3.0.3) 작성 완료.
- **에이전트 하네스 구성**: `.agents/hooks.json` + `guard_spec_edit.py`로 기준 문서 임의 수정 방지(`force_ask`) 적용, `api-rules.md`·`workflow-rules.md` 경량 규칙 세팅 완료.
- **로컬 인프라 구축 완료**: `docker-compose.yml`(`postgis/postgis:16-3.4`, `redis:7-alpine`), `.env.example`, `.gitignore`, `infra-setup.md` 구성 및 컨테이너 헬스체크·`PostGIS 3.4`·`Redis PONG` 검증 완료.

### 2026-11-03
- **`backend/` Spring Boot 4.1 (Java 21) 초기 세팅 완료**: `hibernate-spatial`, `Flyway`(`V1__init_schema.sql` 10개 테이블 마이그레이션), `Security/JWT`, Swagger UI(`/docs`), 공통 `ErrorResponse` 구성 및 검증 통과.
- **`ai-service/` FastAPI 초기 세팅 완료**: `google-genai`(`gemini-3.8-flash`) 래퍼, `CamelModel` 기반 내부 AI 스키마 1:1 매핑, 전역 에러 핸들러 및 `pytest` 3종 검증 통과.
