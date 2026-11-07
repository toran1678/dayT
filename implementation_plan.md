# DayT 구현 계획서 (Implementation Plan)

> **기준 문서**: [docs/prd.md](./docs/prd.md) · [docs/erd.md](./docs/erd.md) · [docs/api-spec.yaml](./docs/api-spec.yaml)  
> **진행 현황 체크리스트**: [progress.md](./progress.md) (`tasks.md` 별도 생성 없이 `progress.md`에서 통합 관리)

---

## 1. 전체 개발 로드맵 (Phases)

| 단계 | 목표 | 핵심 범위 |
| :--- | :--- | :--- |
| **Phase 0** | 기획 · 설계 · 하네스 구축 | PRD, PostGIS ERD, OpenAPI 3.0 명세 확정, 에이전트 API/워크플로우 가드레일 설정 |
| **Phase 1** | 인프라 & 서비스 스캐폴딩 | `docker-compose`(PostgreSQL 16 + PostGIS, Redis), `backend`(Spring Boot), `ai-service`(FastAPI), `web`(Next.js TS + API 타입 생성) 초기 세팅 |
| **Phase 2** | **P0 핵심 MVP** (`F-01`~`F-05`) | 반응형 웹 대시보드 기반 소셜 로그인(JWT) → 지역·음식 장소 탐색(PostGIS·Redis) → 커스텀 코스 CRUD → 지도 마커·폴리라인 동선 렌더링 |
| **Phase 3** | **P1 AI · 공유 고도화** (`F-06`~`F-10`) | 공공/리뷰 수집 및 Gemini 해시태그 요약 → 조건 맞춤 AI 코스 자동 추천 → 카톡 공유 & 구글맵 원클릭 길안내 |
| **Phase 4** | **P2 실시간 · 커플 확장** (`F-11`~`F-14`) | KML 내보내기, STOMP 실시간 공동 코스 편집(`/ws/collab`), 커플 연결·펫 성장·데이트 일기장 |
| **Phase 5** | **모바일 앱 확장** *(추후)* | `web/`의 API 타입·비즈니스 로직을 재사용하여 `mobile/`(Expo React Native) 네이티브 앱으로 이식 |

---

## 2. 구현 원칙 (Architecture Guardrails)

- **클라이언트 전략 (Web-First + 완벽한 모바일 반응형)**: 주력 프론트엔드는 `web/`(Next.js)로 먼저 구현하되, 데스크톱(`lg` 이상)에서는 **상단 세그먼트 필(Pill) 네비게이션 + 풀와이드 맵 분할 뷰**, 스마트폰 브라우저(`lg` 미만)에서는 **플로팅 글래스 하단 독(Bottom Dock) 중심의 모바일 앱 뷰**로 자동 전환되도록 전 화면을 반응형으로 설계한다. (완성 후 API 타입·비즈니스 로직을 재사용해 `mobile/` Expo 앱으로 확장)
- **DB & 공간 연산**: 일반 `postgres` 이미지 대신 **`postgis/postgis:16-3.4`** 를 사용해 `GEOGRAPHY(Point, 4326)` 반경 탐색과 `JSONB` 해시태그 인덱싱을 지원한다.
- **환각(Hallucination) 방지 파이프라인**: AI 코스 추천 시 LLM이 임의로 장소를 지어내지 못하도록, 반드시 `backend`가 DB 내 실존 후보 장소를 먼저 추려 `ai-service`(`InternalAiCourseGenerateRequest`)에 전달한다.
- **계약 우선(Contract-First)**: 모든 DTO·Pydantic·TS 타입은 `docs/api-spec.yaml`과 1:1 일치시킨다.

---

## 3. 현재 작업 계획 (Active Plan)

> *새로운 기능이나 단계(Phase) 구현에 착수할 때 에이전트가 아래 섹션을 현재 작업의 세부 설계(대상 파일, 구현 순서, 검증 방법)로 갱신합니다.*

- **현재 목표**: **Phase 3 (`P1 AI · 데이터 · 공유 고도화: F-06 ~ F-10`) 구현 완료 → Phase 4 (`P2 실시간 협업 · 커플 리텐션: F-11 ~ F-14`) 착수 대기**
- **최근 완료 범위 요약 (Phase 3)**:
  1. **`ai-service/` (`[F-07·08]` & `[F-06]`)**: `ExternalPlaceCollector`(네이버 블로그·TourAPI 스니펫 수집), `PlaceEnrichService`(`gemini-3.8-flash` 정형 해시태그·메뉴·예산 추출 + 휴리스틱 폴백), `CourseGenerateService`(`candidatePlaces` 환각 차단 최적 동선 조합 + Haversine 이동시간·폴리라인 산출) 구현 및 `pytest` 통과
  2. **`backend/` (`[F-06]`, `[F-08]`, `[F-10]`)**: `DefaultAiServiceClient` 내부 API 연동, `PlaceService.getPlaceDetail` 온디맨드 AI 요약 보강, `POST /api/v1/courses/recommend`, `GET /api/v1/courses/{courseId}/google-maps-link` 구현 및 `gradlew test` 통합 검증 완료
  3. **`web/` (`[F-06]`, `[F-09]`, `[F-10]`)**: `AiCourseRecommendModal`(조건 맞춤 추천 프리뷰 → 메이커 편집/즉시 확정 저장), `/courses/shared/[shareToken]` 동적 Open Graph 메타데이터 및 `/api/og/course/[shareToken]` 썸네일 렌더링, 모바일 앱 딥링크·웹 폴백 원클릭 길안내 연동 및 Next.js 16 `cacheComponents` 프로덕션 빌드 검증 완료
