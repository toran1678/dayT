# DayT 진행 상태 및 작업 로그 (Progress & Tasks)

> 별도의 `tasks.md`를 두지 않고, 이 문서에서 **전체 할 일 체크리스트**와 **작업 이력**을 단일 관리합니다.  
> 상태 표기: `[x]` 완료 · `[-]` 진행 중 · `[ ]` 대기

---

## 1. 현재 포커스 (Current Focus)
- **현재 단계**: **`Phase 4 (P2 실시간 협업 · 커플 리텐션: F-11 ~ F-14)` 완료 + 지도·아이콘·SSR 안정성 고도화 반영 완료**
- **현재 진행 작업**: 전역 SVG 아이콘 일원화(`PetStageIcon` 포함), 지도 패닝 시 역·명소/공원·주차장 상시 자동 로드, 현 지도 조건 유지 재탐색 버튼 및 `useSyncExternalStore` 기반 SSR 하이드레이션 일치 수정 완료 (추후 필요 시 `Phase 5` 모바일 네이티브 앱 확장 대기)

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
- [x] `web/` Next.js (TypeScript + Tailwind + App Router) 초기화 및 `openapi-typescript` 타입 생성 연결 *(웹 우선)*

### Phase 2: P0 핵심 MVP 구현 (`F-01` ~ `F-05`)
- [x] **[F-01] 인증/회원**: 카카오·구글 OAuth 로그인, JWT 발급/갱신, 내 정보 조회·수정 (`/api/v1/auth/*`, `/api/v1/users/me`)
- [x] **[F-02] 장소 탐색**: 역·동네 기반 주변 장소 PostGIS 반경 조회, 카카오 로컬 연동 및 Redis 캐싱 (`/api/v1/places`)
- [x] **[F-03] 음식 추천**: 음식 대분류·세부 메뉴·예산 조건 기반 식당 추천 (`/api/v1/places/foods/recommend`)
- [x] **[F-04] 코스 메이커**: 장소 순서 배치, 예상 비용·이동/소요 시간 자동 계산, 코스 CRUD (`/api/v1/courses`)
- [x] **[F-05] 지도 동선 시각화**: Google Maps JS API 반응형 지도(데스크톱·모바일 뷰), 순서 마커 및 이동 경로 폴리라인 렌더링

### Phase 3: P1 AI · 데이터 · 공유 고도화 (`F-06` ~ `F-10`)
- [x] **[F-07·08] 데이터 수집 & AI 요약**: TourAPI·공공데이터·블로그 후기 수집 및 Gemini 해시태그 추출 (`/internal/ai/v1/places/enrich`)
- [x] **[F-06] AI 맞춤 코스 추천**: 후보 장소 필터링(`backend`) + Gemini 최적 동선 조합 (`/api/v1/courses/recommend`)
- [x] **[F-09] 코스 공유**: 공유 토큰 발급 및 카카오톡 Open Graph 썸네일 링크 공유
- [x] **[F-10] 원클릭 길안내**: 완성 코스 경유지 포함 Google Maps Deep Link 연동

### Phase 4: P2 실시간 협업 · 커플 리텐션 (`F-11` ~ `F-14`)
- [x] **[F-11] KML Export**: 구글 '내 지도(My Maps)' 임포트용 KML 다운로드 (`/api/v1/courses/{courseId}/export.kml`)
- [x] **[F-12] 커스텀 테마 맵 & 공유 뷰어**: Google Maps JS API 기반 서비스 무드 커스텀 스타일(JSON) 및 카톡 OG 프리뷰 고도화
- [x] **[F-13] 실시간 공동 편집**: STOMP WebSocket(`/ws/collab`) 기반 동시 장소 추가·삭제·순서 변경
- [x] **[F-14] Grow Together & 일기장**: 커플 연결, 펫 성장·일일 미션, 데이트 일기장 CRUD

### Phase 5: 모바일 네이티브 앱 확장 *(추후 선택)*
- [ ] `mobile/` Expo (React Native + TS) 초기화 및 `web/`의 API 타입·비즈니스 로직 이식

---

## 3. 작업 완료 로그 (Changelog)

### 2026-11-01
- **기획·설계 문서 확립**: `docs/prd.md`, `docs/erd.md`(PostGIS/JSONB), `docs/api-spec.yaml`(OpenAPI 3.0.3) 작성 완료.
- **에이전트 하네스 구성**: `.agents/hooks.json` + `guard_spec_edit.py`로 기준 문서 임의 수정 방지(`force_ask`) 적용, `api-rules.md`·`workflow-rules.md` 경량 규칙 세팅 완료.
- **로컬 인프라 구축 완료**: `docker-compose.yml`(`postgis/postgis:16-3.4`, `redis:7-alpine`), `.env.example`, `.gitignore`, `infra-setup.md` 구성 및 컨테이너 헬스체크·`PostGIS 3.4`·`Redis PONG` 검증 완료.

### 2026-11-03
- **`backend/` Spring Boot 4.1 (Java 21) 초기 세팅 완료**: `hibernate-spatial`, `Flyway`(`V1__init_schema.sql` 10개 테이블 마이그레이션), `Security/JWT`, Swagger UI(`/docs`), 공통 `ErrorResponse` 구성 및 검증 통과.
- **`ai-service/` FastAPI 초기 세팅 완료**: `google-genai`(`gemini-3.8-flash`) 래퍼, `CamelModel` 기반 내부 AI 스키마 1:1 매핑, 전역 에러 핸들러 및 `pytest` 3종 검증 통과.
- **`web/` Next.js 16 반응형 웹 & 통합 실행 환경 구축 완료**: `openapi-typescript` API 타입 자동 생성(`api.d.ts`), 데스크톱 좌측 사이드바·모바일 하단 탭바 반응형 `AppShell` 및 5대 라우트 골격 구현, 원클릭 통합 실행기(`start-dev.ps1`, `.vscode/tasks.json`) 구성 완료.
- **Phase 2 `[F-01] 인증/회원` 풀스택 구현 완료**: 백엔드 카카오·구글 OAuth 검증(로컬 개발용 간편 프리셋 지원), HS256 JWT 발급·회전 및 Redis 세션 저장(`RefreshTokenStore`), `/api/v1/auth/*`·`/api/v1/users/me` 통합 테스트 통과 및 프론트엔드 `AuthProvider`·소셜 로그인/프로필 모달 연동 완료.

### 2026-11-07
- **Phase 2 `[F-02] 장소 탐색` & `[F-03] 음식 추천` 풀스택 구현 완료**: PostGIS `GEOGRAPHY(Point, 4326)` `ST_DWithin` 반경 검색, 카카오 로컬 API 실시간 수집·적재(`DefaultKakaoLocalClient`), Redis 캐싱(`PlaceSearchCacheStore`), 음식·식당 추천(`/api/v1/places/foods/recommend`) 통합 테스트 통과 및 프론트엔드 실시간 탐색·1만원 단위 예산 슬라이더·음식 추천기 연동 완료.
- **Phase 2 `[F-04] 코스 메이커` & `[F-05] 지도 동선 시각화` 풀스택 구현 완료 (Phase 2 완주)**: 백엔드 `/api/v1/courses` CRUD·Haversine 도보 이동시간 보정·`routePolyline` 반환(`CourseIntegrationTest` 통과) 및 프론트엔드 코스 메이커(`/courses/new`), 보관함(`/courses`), 상세·수정·공유 뷰어(`/courses/[courseId]`, `/courses/shared/[shareToken]`), Google Maps JS API + WGS84 벡터 동선 맵(`CourseRouteMap`) 연동 완료.
- **Phase 3 `[F-06]`~`[F-10]` P1 AI · 데이터 · 공유 고도화 풀스택 구현 완료 (Phase 3 완주)**: `ai-service`의 공공/리뷰 수집·`gemini-3.8-flash` 해시태그 요약(`/internal/ai/v1/places/enrich`) 및 환각 차단 코스 조합(`/internal/ai/v1/courses/generate`), `backend`의 온디맨드 AI 보강·`/api/v1/courses/recommend`·구글맵 딥링크(`/api/v1/courses/{courseId}/google-maps-link`), `web`의 `AiCourseRecommendModal`·카톡 동적 OG 썸네일(`/api/og/course/[shareToken]`)·원클릭 길안내 연동 및 전 서비스 빌드·테스트 검증 완료.
- **전국 지역 검색 · 사용자 반경 슬라이더 · Google Places `priceRange` 실측 가격 연동 고도화**: 카카오 주소/키워드 분리 조회로 전국 모든 행정구역·역·랜드마크 탐색 정상화, 프론트엔드 탐색 반경 슬라이더(`500m`~`10km`) 도입, 임의 업종 추정가 제거 후 Google Places API (New) `priceRange`/`priceLevel` 매칭 및 미확인 매장 `'가격 미확인'` 투명 표기 적용 완료.
- **Phase 4 `[F-11]`~`[F-14]` P2 실시간 협업 · 커플 리텐션 풀스택 구현 완료 (Phase 4 완주)**: 구글 '내 지도' KML 다운로드(`/export.kml`), 커스텀 무드 맵 3종(`Warm Editorial`·`Romantic Sunset`·`Midnight Noir`) 및 공유 패스 보관함 복제, STOMP 1.2 WebSocket(`/ws/collab`) 실시간 동시 코스 편집, 6자리 코드 커플 연결·펫 진화·만남 인증·일일 미션(`/together`) 및 코스 연동 데이트 일기장(`/diaries`) 구현·통합 테스트 통과 완료.

### 2026-11-08
- **상세 거리·역세권 인터랙티브 동선 지도(`CourseRouteMap`) 고도화**: 기존 단색 배경 SVG 폴백을 실제 한국어 도로·골목·공원이 표시되는 웹 메르카토르(`EPSG:3857`) 타일 엔진 + 3종 무드 테마 필터로 교체하고, 확대/축소(`+`/`-`·휠·더블클릭)·드래그 패닝·`전체 맞춤`·`크게 보기`·실측 축척 바(`Scale Bar`), 카카오 로컬(`SW8`·`AT4`·`CT1`·`PK6`) 연동 주변 지하철역(호선 컬러·첫 장소까지 도보 동선 가이드)·명소·주차장 레이어 및 밀집 마커 겹침 방지 적용 완료.
- **전역 SVG 아이콘 일원화 · 지도 이동 실시간 컨텍스트 & 현 지도 재탐색 · Hydration 오류 수정**: 커플 펫 단계별 벡터 SVG(`PetStageIcon`) 및 주차장·명소/공원·지하철역·메뉴 추천기 등 전 화면 이모지를 SVG로 교체하고, 지도 이동 시 `역`·`명소·공원`·`주차장` 전체 레이어 자동 갱신 및 기존 필터 조건 유지 **`이 지역에서 다시 탐색`** 버튼 추가, `useSyncExternalStore` 기반 `useDraftPlaces()` 도입으로 SSR/클라이언트 하이드레이션 불일치 해결 완료.
- **데이트 탐색 좌(검색·스팟 상세) / 우(대형 지도) 2단 분할 레이아웃 & 실시간 가게/음식 사진 스포트라이트(`PlaceSpotlightCard`) 구현**: 하단 20곳 리스트를 제거하고 데스크톱 기준 좌(5):우(7) 2단 분할 및 Sticky 대형 지도 배치, 카카오 Daum 이미지 검색 API(`dapi.kakao.com/v2/search/image`) 연동 Next.js Route Handler(`/api/place-photos`) 및 카테고리별 고화질 큐레이션 폴백 구축, 지도 마커 선택 시 좌측에 가게/음식 실제 사진 갤러리 캐러셀·AI 요약·메뉴·카카오맵 링크를 제공하는 `PlaceSpotlightCard` 연동 완료 (`typecheck` & `eslint` 0 error/0 warning 통과).
- **데이트 탐색 UI/UX 종합 고도화 (이미지 핫링크 해제·슬라이더 정돈·풀화면 고정 지도·상세 팝업창·메뉴추천 맵 연동·담은 장소 영구 유지)**: 외부 블로그 403 차단 방지 `referrerPolicy="no-referrer"` 및 `thumbnailUrl`/큐레이션 삼중 폴백, 슬라이더 불일치 중간 라벨 제거, 지도 헤더 문구 정리, 메뉴 추천 시 식당 핀 지도 실시간 업데이트 및 상세창 자동 오픈, 데스크톱 풀화면 고정 뷰포트(`h-[calc(100vh-125px)]`)로 위아래 스크롤 제거, 스팟 클릭 시 플로팅 모달창 팝업, 지도 이동 재탐색 시 이미 담은 장소 상시 지도 핀 유지 완료 (`typecheck` & `eslint` 0 error/0 warning 통과).
- **지도 SSR/클라이언트 Hydration 소수점 불일치 해결 & 프리셋 칩 제거 후 지하철역 자동완성 텍스트 힌트 도입**: `latLngToContainerPx` 및 타일 핀 인라인 스타일에 정수형 `Math.round()` 좌표와 `suppressHydrationWarning`을 적용하여 Next.js/React 19 소수점 렌더링 불일치(569.004px vs 569.0036...px)를 원천 차단하고, 고정 프리셋 칩 대신 수도권 주요 핫스팟 지하철역 실시간 자동완성 힌트 드롭다운(`subway-search-data.ts`) 및 키보드 네비게이션 연동 완료 (`typecheck` & `eslint` 0 error/0 warning 통과).
- **지도 캔버스 높이 붕괴(0px) 해결 및 Sticky 데스크톱 레이아웃 복원**: `CourseRouteMap`에 미지정 부모 높이 의존 시 0px로 축소되던 문제 방지를 위해 `min-h-[460px]` 최소 높이 가드레일을 부여하고, `ExploreClientView`의 우측 지도를 `lg:sticky lg:top-20`과 `h-[540px] lg:h-[calc(100vh-210px)] min-h-[500px]`로 명시 설정하여 코스 메이커와 동일하게 풀사이즈로 즉시 렌더링되도록 수정 완료 (`typecheck` & `eslint` 0 error/0 warning 통과).
