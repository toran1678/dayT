# DayT 구현 계획서 (Implementation Plan)

> **기준 문서**: [docs/prd.md](./docs/prd.md) · [docs/erd.md](./docs/erd.md) · [docs/api-spec.yaml](./docs/api-spec.yaml)  
> **진행 현황 체크리스트**: [progress.md](./progress.md) (`tasks.md` 별도 생성 없이 `progress.md`에서 통합 관리)

---

## 1. 전체 개발 로드맵 (Phases)

| 단계 | 목표 | 핵심 범위 |
| :--- | :--- | :--- |
| **Phase 0** | 기획 · 설계 · 하네스 구축 | PRD, PostGIS ERD, OpenAPI 3.0 명세 확정, 에이전트 API/워크플로우 가드레일 설정 |
| **Phase 1** | 인프라 & 서비스 스캐폴딩 | `docker-compose`(PostgreSQL 16 + PostGIS, Redis), `backend`(Spring Boot), `ai-service`(FastAPI), `mobile`(Expo TS + API 타입 생성) 초기 세팅 |
| **Phase 2** | **P0 핵심 MVP** (`F-01`~`F-05`) | 소셜 로그인(JWT) → 지역·음식 장소 탐색(PostGIS·Redis) → 커스텀 코스 CRUD → 지도 마커·폴리라인 동선 렌더링 |
| **Phase 3** | **P1 AI · 공유 고도화** (`F-06`~`F-10`) | 공공/리뷰 수집 및 Gemini 해시태그 요약 → 조건 맞춤 AI 코스 자동 추천 → 카톡 공유 & 구글맵 원클릭 길안내 |
| **Phase 4** | **P2 실시간 · 커플 확장** (`F-11`~`F-14`) | KML 내보내기, Next.js 공유 웹 뷰어(`web/`), STOMP 실시간 공동 편집(`/ws/collab`), 커플 연결·펫 성장·데이트 일기장 |

---

## 2. 구현 원칙 (Architecture Guardrails)

- **DB & 공간 연산**: 일반 `postgres` 이미지 대신 **`postgis/postgis:16-3.4`** 를 사용해 `GEOGRAPHY(Point, 4326)` 반경 탐색과 `JSONB` 해시태그 인덱싱을 지원한다.
- **환각(Hallucination) 방지 파이프라인**: AI 코스 추천 시 LLM이 임의로 장소를 지어내지 못하도록, 반드시 `backend`가 DB 내 실존 후보 장소를 먼저 추려 `ai-service`(`InternalAiCourseGenerateRequest`)에 전달한다.
- **계약 우선(Contract-First)**: 모든 DTO·Pydantic·TS 타입은 `docs/api-spec.yaml`과 1:1 일치시킨다.

---

## 3. 현재 작업 계획 (Active Plan)

> *새로운 기능이나 단계(Phase) 구현에 착수할 때 에이전트가 아래 섹션을 현재 작업의 세부 설계(대상 파일, 구현 순서, 검증 방법)로 갱신합니다.*

- **현재 목표**: **Phase 1 (2/4) — `backend/` Spring Boot 4.1 (Java 21) 초기 아키텍처 및 DB 스키마 세팅**
- **세부 작업 순서**:
  1. 루트 `.gitignore`에 `backend/.gitignore` 규칙 통합 및 중복 파일(`backend/.gitignore`, `application.properties`) 정리
  2. `backend/build.gradle`: JDK `21` 툴체인 설정 및 `hibernate-spatial`(PostGIS), `flyway`(`flyway-database-postgresql`), `oauth2-resource-server`(JWT) 의존성 추가
  3. `backend/src/main/resources/application.yml` 작성 (`dayt-postgres`, `dayt-redis`, Flyway, JPA `validate`, JWT 환경 변수 연동)
  4. `backend/src/main/resources/db/migration/V1__init_schema.sql` 작성 (`docs/erd.md` 10개 테이블 및 `GIST`·`GIN` 인덱스 1:1 반영)
  5. `com.dayt.global` 공통 기반 구성 (`JpaConfig`, `BaseTimeEntity`, `SecurityConfig`, `ErrorCode`, `BusinessException`, `ErrorResponse`, `GlobalExceptionHandler`)
- **검증 기준**:
  - `.\gradlew.bat test` 실행 시 Flyway 마이그레이션 자동 적용 + JPA 스키마 검증 + Spring Context 로드 통과
  - `.\gradlew.bat bootRun` 시 `/actuator/health` 정상(`UP`) 응답 및 미존재 경로 호출 시 명세 규격 `ErrorResponse` 반환 확인
