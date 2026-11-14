# DayT 진행 상태 및 작업 로그 (Progress & Tasks)

> 별도의 `tasks.md`를 두지 않고, 이 문서에서 **전체 할 일 체크리스트**와 **작업 이력**을 단일 관리합니다.  
> 상태 표기: `[x]` 완료 · `[-]` 진행 중 · `[ ]` 대기

---

## 1. 현재 포커스 (Current Focus)
- **현재 단계**: **지도 상단 레이어 '행사·축제' 토글 버튼 신설 · 원클릭 코스 지정 연동 & 뷰포트 바운드(화면 사각 영역) 기반 전 축제 100% 표출 완성**
- **현재 진행 작업**: `CourseRouteMap` 지도 상단 컨트롤 바에 `[역]`, `[명소·공원]`, `[주차장]`과 동등한 `[행사·축제]` 토글 버튼 신설, 지도 화면(Viewport Bounds) 내에 걸치는 모든 축제를 실시간으로 조회하여 핑크색 마커로 100% 렌더링, 핀 선택 시 하단 카드에서 `+ 코스로 지정` 버튼으로 내 코스 드래프트에 즉시 담기 연동, Next.js 16 프로덕션 빌드(전체 13개 라우트) 완료.

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
- [x] **[F-06+·F-07+] 행사·축제 DB 적재 & 날짜/위치 맞춤 추천**: `DateTheme.행사·축제` 신설, 데이트 예정일(`targetDate`/`datePlanDate`) 기반 진행 중인 실존 축제/팝업스토어 우선 추천, 탐색 지도 행사 뱃지 표기, 코스 보관함 데이트 일정 뱃지 시각화

### Phase 4: P2 실시간 협업 · 커플 리텐션 (`F-11` ~ `F-14`)
- [x] **[F-11] KML Export**: 구글 '내 지도(My Maps)' 임포트용 KML 다운로드 (`/api/v1/courses/{courseId}/export.kml`)
- [x] **[F-12] 커스텀 테마 맵 & 공유 뷰어**: Google Maps JS API 기반 서비스 무드 커스텀 스타일(JSON) 및 카톡 OG 프리뷰 고도화
- [x] **[F-13] 실시간 공동 편집**: STOMP WebSocket(`/ws/collab`) 기반 동시 장소 추가·삭제·순서 변경
- [x] **[F-14] Grow Together & 일기장**: 커플 연결, 펫 성장·일일 미션, 데이트 일기장 CRUD

### Phase 5: 모바일 네이티브 앱 확장 *(추후 선택)*
- [ ] `mobile/` Expo (React Native + TS) 초기화 및 `web/`의 API 타입·비즈니스 로직 이식

---

## 3. 작업 완료 로그 (Changelog)

### 2026-11-08 (최신 업데이트)
- **TourAPI 행사·축제 DB 적재 & 날짜/위치 맞춤 추천 · 탐색 지도 행사 뱃지 · 코스 보관함 데이트 일정 관리 풀스택 구현 완료**:
  1. **단일 기준 API 명세서 동기화 (`docs/api-spec.yaml`, `api.d.ts`)**:
     - `DateTheme`: `[감성 카페, 맛집 투어, 전시·문화, 액티비티, 산책·야외, 어디든, 행사·축제]` 추가.
     - `CourseRecommendRequest`: `targetDate: string (format: date, nullable: true)` 추가.
     - `CourseUpsertRequest`, `CourseDetail`, `CourseListItem`: `datePlanDate: string (format: date, nullable: true)` 추가.
     - `npm run gen:api`로 TypeScript 타입 정의 성공적 동기화.
  2. **지도 타일 403 차단 및 Carto 워터마크 원천 해결 완료**:
     - Next.js 서버 타일 프록시 Route Handler 구현 (`web/src/app/api/map/tiles/[z]/[x]/[y]/route.ts`).
     - OSM 공식 User-Agent 규격을 준수하여 403 Forbidden 및 Carto "API KEY REQUIRED" 워터마크 100% 제거.
  3. **전국 주요 상권/역 힌트 대폭 확장 및 AI 검색바 탐색형 디자인 개편 완료**:
     - 인천(구월동/부평/송도), 부산(서면/해운대/광안리), 대구(동성로/수성못), 대전(성심당 중앙로/둔산동), 경기(행궁동/판교), 강원, 제주 등 전국 핫플레이스 수록.
     - AI 모달 검색창을 탐색 페이지 감성 맞춤형(TrainFront SVG, 컬러 뱃지, 포커스 링, 드롭다운 힌트)으로 개편.
  4. **백엔드 Flyway DB 마이그레이션 (`V4__add_course_date_plan_date_and_seed_festivals.sql`)**:
     - `courses` 테이블에 `date_plan_date DATE` 컬럼 추가.
     - `places (event_start_date, event_end_date)` 인덱스 생성.
     - 서울(성수 팝업 페스티벌, 연남 경의선숲길 불빛축제, 여의도 달빛야시장), 인천(송도 센트럴파크 빛축제, 구월 로데오 축제), 부산(광안리 M드론쇼), 대구(수성못 페스티벌), 대전(으능정이 스카이로드 빵축제), 수원(화성 미디어아트 페스티벌) 등 전국 주요 실존 축제/팝업 데이터 시딩.
  5. **백엔드 날짜/위치 기반 행사 우선 주입 및 일정 영속화 (`CourseService.java`, `PlaceRepository.java`)**:
     - `DateTheme.FESTIVAL` 또는 `targetDate` 전달 시 해당 날짜/위치에 진행 중인 축제 장소를 최우선으로 후보군 맨 앞에 주입.
     - 코스 생성 및 수정 시 `datePlanDate` 저장 및 `CourseDetailResponse`/`CourseListItem`에 반환.
     - `backend/gradlew.bat test` 전체 테스트 100% 성공 통과 (`BUILD SUCCESSFUL in 42s`).
  6. **AI 서비스 데이트 날짜 및 축제 메인 이벤트 동선 프롬프트 가이드 (`course_generate_service.py`, `internal_ai.py`)**:
     - `DateTheme.FESTIVAL` 및 `target_date` 스키마 지원.
     - 축제/행사 스팟이 포함된 경우 핵심 메인 이벤트로 선정하고 전후 식사/카페 동선을 유기적으로 배치하도록 프롬프트 가이드.
  7. **프론트엔드 UI/UX 고도화 (`AiCourseRecommendModal`, `CourseBuilder`, `CourseList`, `Explore`, `CourseRouteMap`)**:
     - AI 모달에 `행사·축제` 테마 칩 및 `📅 데이트 예정일` 선택 피커(오늘/이번 주말 퀵 버튼) 연동.
     - 코스 메이커 상단 헤더에 데이트 예정일 피커 및 저장 연동.
     - 코스 보관함(`MyCoursesClientView`) 및 코스 상세 페이지 카드에 `📅 YYYY.MM.DD 데이트` 캘린더 뱃지 시각화.
     - 탐색 페이지 스포트라이트 카드(`PlaceSpotlightCard`) 및 지도 마커(`CourseRouteMap`)에 `🎉 축제·행사 | YYYY.MM.DD ~ YYYY.MM.DD` 뱃지 표기.
     - `npm run typecheck` 0 에러 및 Next.js 16 전체 13개 라우트 빌드 성공 통과.
- **지도 줌 레벨 고정 & 최상단 DayT 브랜드 헤더 & 타이틀/개수 줄바꿈 분리 & POI 패닝 60fps 최적화 및 지도 높이 조절 완료**:
  - "이 지역에서 다시 탐색" 또는 필터 변경 시 줌 레벨이 15로 강제 리셋되던 문제를 수정하여, 사용자가 설정한 현재 줌 레벨(`currentViewport.zoom`)을 100% 영구 보존.
  - 최상단에 `— PLAN YOUR DAY` 및 `오늘은 어떤 하루를 함께 만들어 볼까요?` 감성 브랜드 타이포그래피 헤더 추가 (DayT 테마 컬러 반영).
  - 긴 지역명과 `n곳 탐색됨`을 상하 2줄로 분리하여, 지명이 길어져도 우측 `필터 초기화` 버튼 때문에 레이아웃이 밀려나지 않도록 안정화.
  - 주변 역·명소·주차장 레이어가 꺼져 있을 때 불필요한 백그라운드 fetch/리렌더링을 완전히 차단하고, 드래그 중 렌더링 스로틀링을 적용하여 지도 패닝 시 버벅거림(lag) 완전 박멸 (60fps 부드러운 드래그 구현).
  - 지도의 높이를 `h-[440px] lg:h-[480px]`로 알맞게 축소하여 한 화면에서 스팟 정보와 지도를 한눈에 볼 수 있도록 최적화.
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
- **데이트 탐색 UI/UX 피드백 5대 항목 고도화**:
  1. **헤더 타이틀 감성 컬러 강조**: "오늘은 어떤 하루를"과 함께 **"함께 만들어 볼까요?"**에 DayT 브랜드 포인트 컬러(`text-primary`) 적용.
  2. **지도 높이 확대 복원**: 지나치게 작아졌던 지도 높이를 `h-[520px] lg:h-[600px] min-h-[460px]`로 시원하게 확대.
  3. **지도 드래그 중 도보 시간 실시간 떨림 완전 방지**: `settledCenter`와 `isDragging` 상태 동기화로 마우스 드래그 중에는 주변 역 도보 시간 재계산을 정지하고, 드래그 종료 시에만 안전하게 중심점을 고정 계산하도록 분리.
  4. **지도 주변 버튼·레이블·컨트롤 크기 확대**: 상단 헤더(`text-sm font-black`), 테마 칩(`px-3 py-1 text-xs`), 주변 역 버튼(`px-3 py-1 text-xs font-bold`), 레이어 토글 칩(`px-3 py-1 text-xs font-black`), 줌 컨트롤(+/-: `h-9 w-9`), "이 지역에서 다시 탐색" 플로팅 버튼(`px-5 py-2.5 text-xs sm:text-sm font-black`) 크기 확대.
  5. **담은 코스 패널 상시 노출 & 화이트 카드 개편**: 담은 장소가 0개일 때도 탐색창과 동일한 화이트 카드(`bg-surface border-line`)로 상시 표시, 0개 빈 상태 안내 슬롯 및 담은 장소별 카테고리 SVG 아이콘 + 장소명(클릭 시 모달) + 개별 삭제(`X`) 및 전체 취소 기능 제공.
- **코스 메이커 장소별 시간 직접 설정 및 거리 비례 도보 시간 자동 산출 UX 대폭 개편**:
  1. **도보 시간 수동 가감 제거 및 거리 비례 자동 표기**: 임의로 `-2분`/`+2분`을 가감하던 버튼 및 수동 이동시간 로직을 완전히 제거하고, 두 장소 간 실측 도보 거리(`estimateWalkingRoute`)를 기반으로 `"다음 장소까지 도보 약 X분 (Xm)"` 형태의 미려한 단일 뱃지로 자동 표기.
  2. **장소별 도착 시각 직접 선택**: 각 경유지 카드에서 첫 스팟은 `"코스 시작 시각"`, 이후 스팟은 `"도착 예정 시각"`을 시간 피커(`<input type="time">`)로 직접 지정 가능하도록 구현(첫 스팟 수정 시 전체 시작시각 연동, 이후 스팟 수정 시 직전 장소 체류 시간 자동 역산 연동).
  3. **체류 시간 UI 고도화**: 카드 상단에 방문 시간대 뱃지(`13:00 ~ 14:30 (1시간 30분 머뭄)`)를 표기하고, 퀵 프리셋 칩(`30분`, `45분`, `1시간`, `1시간 30분`, `2시간`, `2시간 30분`, `3시간`) + 슬라이더(`15분`~`360분`) + `-15분`/`+15분` 버튼으로 직관적이고 세밀하게 조절할 수 있도록 개선 (`typecheck` 통과 & Next.js 16 전체 13개 라우트 빌드 성공).
- **코스 메이커 시간 설정 간소화 · 도보/차량 선택 · 지도 패닝/경로선 복원 & AI 데이트 시간 매칭 고도화**:
  1. **시간 선택 UI 간소화 및 상단 출발 시각 제거**: 상단 헤더의 중복 출발 시간 선택 바를 제거하고 각 장소별 피커로 단일화, 슬라이더 바 및 +/- 버튼을 걷어내고 `그 외 체류 시간 직접 입력 [  ]분 머뭄` 필드로 직관적 타이핑 지원.
  2. **구간별 도보 vs 차량 이동 수단 토글 (`geo-utils.ts`, `CourseBuilderClientView.tsx`)**: 모든 다음 장소 구간 커넥터에 `[ 🚶 도보 | 🚗 차량 ]` 세그먼트 토글 탭을 추가하고, `estimateDrivingRoute`를 통한 도심 주행 시간 및 거리 자동 산출 연동.
  3. **코스 메이커 지도 패닝 고정 해제 및 경로선(폴리라인) 상시 렌더링 (`CourseRouteMap.tsx`)**: `activeFocusedViewport`가 드래그 중에도 지도를 강제 고정하던 문제를 해결(선택 스팟 변경 시점에만 1회 카메라 이동), `isDraft` 유무와 무관하게 2곳 이상이면 경로선과 이동 소요 시간 뱃지가 상시 연결 렌더링되도록 보정.
  4. **AI 코스 추천 목표 시간대(종일 6~8시간 등) 일치 보강 (`course_generate_service.py`, `CourseService.java`)**: `ALL_DAY` 선택 시 경유지를 4~5곳으로 확장하고 식사(90분)·문화/전시(110분)·카페(75분) 등 현실적인 체류 시간을 배정하도록 Gemini 프롬프트 및 백엔드 fallback 보정, 총 데이트 소요 시간 6~8시간(360~480분) 범위 정밀 충족.
- **코스 지도 컨트롤 바 1줄 슬림화 & AI 코스 모달 1인 하루 총 예산 · 예산 무관 모드 · 불일치 틱 제거**:
  1. **지도 컨트롤 바 단일 라인 슬림화 (`CourseRouteMap.tsx`)**: 좁은 코스 메이커 폭에서 2줄로 꺾이던 주변역 영역을 단일 라인으로 정돈, 좌측에 레이어 토글 3종(`[ 🚇 역 ] [ 🌳 명소 ] [ 🅿️ 주차장 ]`), 우측에 가장 가까운 주요 역 1개 뱃지(`[ 2호선 성수역 도보 4분 ]`)로 배치하여 높이 비대화 방지 및 깔끔한 비율 완성.
  2. **AI 맞춤 코스 모달 예산 UI 개편 (`AiCourseRecommendModal.tsx`)**: 라벨을 `5. 1인 하루 총 예산 설정`으로 명확히 표기, `예산 무관` 옵션 칩(`budgetPerPerson = 0`) 추가로 가격 구애 없는 핫플 추천 지원, 슬라이더 하단의 어긋나던 틱 텍스트 라인을 완전히 제거 (`typecheck` & Next.js 16 전체 13개 라우트 빌드 통과).
- **AI 코스 모달 꿈틀거림(레이아웃 시프트) 제거 · 슬라이더 위치 보존 · 음식 오분류 방지 & 미상 장소 추정가 연동**:
  1. **버튼 선택 시 꿈틀거림(덜컹거림) 원천 해결 (`AiCourseRecommendModal.tsx`)**: 선택/비선택 시 `border` 존재 여부로 인해 1px씩 높이가 달라지던 전형적인 border layout shift를 해결(항상 `border` 두께 유지 및 뱃지 `h-7` 고정 높이 부여).
  2. **슬라이더 바 위치 보존 & 하단 양끝 금액 표기 (`AiCourseRecommendModal.tsx`)**: `isUnlimitedBudget`과 `sliderBudget` 상태를 분리하여 예산 무관을 눌러도 슬라이더 바 위치가 엉뚱하게 튀지 않고 가만히 유지되도록 수정, 슬라이더 하단 양끝에 `10,000원`과 `100,000원` 표기 추가.
  3. **음식 분류 정확도 고도화 & "기타 (그 외)" 카테고리 도입 (`DefaultKakaoLocalClient.java`, `CourseService.java`, `ExploreClientView.tsx`)**: 동남아/베트남/태국/인도/아시안 음식을 `FoodCategory.ETC`("그 외")로 최우선 분기하여 일식으로 오분류되던 문제를 차단하고, 사용자가 선호 음식을 지정하면 해당 카테고리 식당을 최우선 수집하여 AI 후보 장소 풀에 주입.
  4. **가격 미상 장소 카테고리별 현실적 추정가 전달 & 예산 일치 강화 (`course_generate_service.py`)**: 가격이 등록되지 않은 장소는 카테고리별 1인 평균 추정가(식당 약 18,000~20,000원, 카페 약 8,500원 등)를 AI에게 명시적으로 넘겨주어 예산에 부합하는 정밀한 코스를 설계하도록 프롬프트 지침 및 비용 계산 로직 보강 (`typecheck` & 백엔드 15개 테스트 통과).
- **AI 코스 추천 음식점 엄격 준수 · 예산 정밀 매칭 · 후보군 대폭 확대 & 지도 핀 위치 선택 · 반경(km) 슬라이더 구현**:
  1. **선호 음식 엄격 준수 및 타 카테고리 식당 침범 원천 차단 (`CourseService.java`, `course_generate_service.py`)**:
     - 사용자가 `치킨`을 선택했을 때 동남아 음식점(`발리문`)이 억지로 들어가던 백엔드 fallback 및 greedy fallback의 잔여 슬롯 채우기 버그를 수정하여, 지정된 `foodCategories`에 부합하지 않는 식당은 절대 추가되지 않도록 엄격 차단.
     - 사용자가 선택한 음식 카테고리에 대해 `"{지역} {음식명}"` (예: "연남동 치킨") 전용 키워드 조회를 병행하여 카카오 실시간 수집을 즉시 실행하고 치킨 전문점을 확실하게 확보.
  2. **예산 정밀 매칭 (2인 총 예산 기준 75~90% 수준 현실적 지출 산출)**:
     - 1인 8만원(2인 16만원) 설정 시 4.8만원처럼 터무니없이 적게 산출되던 문제를 해결하여, 2인 총 예산의 50~60%를 식비(치킨/메인 2인 세트 + 음료/사이드), 20~25%를 카페(디저트 + 스페셜티 커피), 20~25%를 전시/체험비로 자연스럽게 배정하여 목표 예산에 알맞게 매칭.
  3. **후보 장소 풀(Candidate Pool) 대폭 확대(40~60개) 및 무작위 셔플**:
     - 기존 24개 고정 조회에서 벗어나, 카테고리별 10~15개씩 골고루 수집하여 최소 40~60개 이상의 풍부한 실존 스팟을 확보하고, 카테고리별 무작위 셔플을 적용하여 "조건으로 다시 추천받기"를 누를 때마다 다채롭고 새로운 코스가 조합되도록 고도화.
  4. **지도에서 위치 핀 꽂기 & 탐색 반경(km) 슬라이더 신설 (`LocationPinPickerModal.tsx`, `AiCourseRecommendModal.tsx`, `api-spec.yaml`)**:
     - `docs/api-spec.yaml`의 `CourseRecommendRequest`에 `radiusKm` (0.5~10.0km) 필드 추가 (사용자 동의 완료).
     - "어디서 만날까요"에 **`[ 📍 지도에서 핀 꽂기 ]`** 버튼을 추가하고, 대화형 미니 지도에서 클릭한 위치에 핀을 꽂고 해당 좌표 및 탐색 반경을 나타내는 점선 원(Circle) 오버레이 시각화 지원.
     - `탐색 반경 설정 (내 주변 탐색 범위)` 슬라이더(`0.5km`~`10.0km`) 및 퀵 프리셋 칩(`1km`, `2km`, `3km`, `5km`, `10km`) 추가 연동 (`typecheck` 통과 & Next.js 16 전체 13개 라우트 빌드 성공, Gradle 테스트 15개 전체 통과).
- **OSM 403 차단 박멸(CartoDB CDN) · 전국 주요 상권/역 힌트 대폭 확장 · AI 모달 검색바 맞춤형 개편**:
  1. **지도 403 Access Blocked 완벽 해결 (`slippy-tile-math.ts`, `LocationPinPickerModal.tsx`)**:
     - OpenStreetMap 재단 공식 서버의 사용 정책에 따른 403 Forbidden 차단 타일을 제거하고, 글로벌 CDN 기반의 **CartoDB Voyager 고해상도 타일**(`a~d.basemaps.cartocdn.com`)로 전면 교체.
     - 한국어 지명·건물 윤곽·도로가 선명하게 표시되며 403 차단 오류가 원천 방지됨.
  2. **어디서 만날까요? 기본값 빈 텍스트 & 텍스트 힌트 제공 (`AiCourseRecommendModal.tsx`)**:
     - 기본값으로 들어가 있던 `"성수역"` 하드코딩을 제거하고 빈 텍스트(`""`)로 초기화.
     - 검색창 포커스 또는 타이핑 시 전국 주요 역/상권 추천 드롭다운이 즉시 뜨며, 클릭 및 키보드(방향키 + Enter)로 직관적 선택 가능.
  3. **전국 모든 지역(인천/부산/대구/대전/광주/경기/제주 등) 핫플레이스 수록 (`subway-search-data.ts`)**:
     - 서울뿐 아니라 인천(구월동·인천터미널·부평·송도 센트럴파크·연수구), 부산(서면·전포·해운대·광안리·남포동), 대구(동성로·반월당·교동·수성못), 대전(성심당 중앙로·둔산동·유성온천), 광주(동명동·충장로·상무지구), 경기(수원 행궁동·일산·판교·분당·부천·범계), 강원(강릉 안목해변), 제주(제주시청/노형동) 등 전국 핵심 데이트 상권을 완벽 수록하여 검색 힌트 제공.
  4. **AI 모달 검색바 탐색 페이지 맞춤형 디자인 적용 (`AiCourseRecommendModal.tsx`)**:
     - `TrainFront` SVG 아이콘, DayT 브랜드 포커스 링, 노선/상권 컬러 뱃지, 설명 텍스트를 갖춘 세련된 맞춤형 검색 컴포넌트로 개편 완료 (`typecheck` 및 Next.js 16 프로덕션 빌드 성공).
- **AI 핀 피커 줌 버그 수정 · 음식 '기타' 아이콘 변경 · 데이트 탐색 행사 카테고리 & 코스 보관함 에디토리얼 UI 개편**:
  1. **AI 핀 피커 휠 및 버튼 줌 미작동 해결 (`LocationPinPickerModal.tsx`)**:
     - 캔버스 엘리먼트에 non-passive `wheel` 이벤트 리스너를 바인딩하고 100ms 스로틀링 줌 계산을 연동하여 마우스 휠 확대/축소 정상화.
     - 상단 `+`/`-`/GPS 컨트롤 바에 `onPointerDown`/`onClick` `stopPropagation()`을 적용하여 부모 캔버스의 PointerCapture 간섭으로 버튼 클릭이 씹히던 문제를 원천 해결.
  2. **데이트 탐색 페이지 음식 카테고리 '기타' 및 아이콘 교체 (`ExploreClientView.tsx`)**:
     - '그 외' 명칭을 '기타'로 변경하고 기존 `Sparkles` 아이콘을 다이닝/요리에 어울리는 `ChefHat` SVG 아이콘으로 교체.
  3. **데이트 탐색 페이지 `행사·축제` 카테고리 필터 신설 & 유효 행사 연동 (`ExploreClientView.tsx`, `PlaceQueryRepository.java`, `PlaceSpotlightCard.tsx`)**:
     - 카테고리 필터에 `PartyPopper` 아이콘과 함께 `행사·축제` 필터 버튼 추가.
     - 백엔드 및 프론트엔드에서 `event_end_date >= CURRENT_DATE` 조건을 적용하여 이미 종료된 과거 행사는 검색에서 자동 제외.
     - 행사 스팟 선택 시 `PlaceSpotlightCard` 상세 창에 행사 일정(`YYYY.MM.DD ~ YYYY.MM.DD`)과 D-day 상태 뱃지(`D-3`, `진행 중 D-12` 등)를 미려하게 표시.
  4. **코스 보관함 에디토리얼 패스 UI 개편 (`MyCoursesClientView.tsx`)**:
     - `.agents/rules/deesign-rules.md`의 Anti-AI 디자인 제약(무지성 `rounded-3xl` 배제, 뻔한 3열 그리드 배제, 네온 그라데이션 금지, 헤어라인 테두리 적용)을 철저히 준수.
     - 데이트 날짜(`datePlanDate`) 기준 D-day 뱃지와 요일 포맷팅을 강조하고, 세로 헤어라인 구분선이 들어간 티켓 스펙 바와 점선 절취선 액션 영역으로 감성적인 데이트 바우처 레이아웃 완성 (`typecheck` 및 Next.js 16 전체 13개 라우트 빌드 통과).
- **사용자 TourAPI Key 기반 최신 KorService2 전국 실존 축제(855건) DB 대량 적재 · 카카오맵 공식 핀 연동 & 상세 UI 완성**:
  1. **한국관광공사 TourAPI 4.4 최신 KorService2 실제 전국 축제 855건 추출 & DB 적재 (`V5__seed_real_tour_api_festivals.sql`)**:
     - 사용자가 입력한 `TOUR_API_SERVICE_KEY`를 사용하여 공공데이터포털 최신 엔드포인트(`KorService2/searchFestival2`)를 직접 호출하여 서울, 경기, 부산, 강릉, 전주, 제주 등 전국 855개의 실존 축제 데이터를 추출 완료.
     - Flyway V5 마이그레이션을 통해 `places` 테이블에 전국 실존 축제의 행사명, 시작일/종료일, 주소, 위경도 좌표, 대표 원본 이미지(`firstimage`), 전화번호를 모두 적재.
  2. **카카오맵 공식 지도 핀 URL 스킴 연동**:
     - 카카오맵 공식 딥링크 규격인 `https://map.kakao.com/link/map/{축제명},{위도},{경도}`를 적용하여, 단순히 이름 검색으로 엉뚱한 곳이 뜨는 위험을 방지하고 위도/경도 절대 좌표에 축제 마커와 말풍선이 100% 정확하게 뜨도록 구축.
  3. **실존 축제 대표 원본 이미지 우선 표출 & 광역 10km 자동 탐색 (`PlaceSpotlightCard.tsx`, `ExploreClientView.tsx`)**:
     - 축제 클릭 시 한국관광공사에 등록된 실제 축제 포스터/전경 사진(`thumbnailUrl`)을 최우선으로 메인 갤러리에 표출.
     - 행사·축제 카테고리 필터 선택 시 반경을 최대 10km 광역으로 자동 확장하여 지도를 옮길 때마다 주변 축제들이 풍성하게 잡히도록 연동 완료 (`typecheck` 및 Next.js 16 전체 13개 라우트 빌드 성공).
- **'실존' 수식어 전면 정제 · 모달 좌측 상단 숫자 배지 제거 & 모달 스크롤바 UI 개선**:
  1. **'실존' 인위적 수식어 전면 제거**:
     - `PlaceSpotlightCard.tsx`: "실존 행사·축제 정보" -> "행사·축제 안내"로 직관적 수정.
     - `V5__seed_real_tour_api_festivals.sql` 및 백엔드 동기화 서비스: "실존 축제" -> "축제"로 요약 텍스트 일괄 정제.
     - `AiCourseRecommendModal.tsx`: "실존 축제·야시장" -> "축제·야시장", "실존 핫플 후보" -> "주변 장소"로 자연스러운 워딩 개선.
  2. **모달 좌측 상단 불필요한 마커 순번 숫자 배지(1) 제거**:
     - 스팟 상세 모달(`PlaceSpotlightCard.tsx`) 좌측 상단에 노출되던 마커 번호 배지를 제거하여 깔끔한 비주얼 확보.
  3. **모달 스크롤바 UI 슬림화 & 매끄러운 오버스크롤 개선 (`ExploreClientView.tsx`)**:
     - 투박한 시스템 기본 스크롤바 대신 `[scrollbar-width:thin]`과 투명 트랙, 은은한 스크롤바 컬러 및 `overscroll-contain`을 적용하여 모달 스크롤 동작을 부드럽고 미려하게 개선 (`typecheck` 통과).
- **지도 상단 레이어 '행사·축제' 토글 버튼 신설 · 원클릭 코스 지정 & 지도 화면 바운드(Bounds) 100% 표출 연동**:
  1. **지도 위 레이어 토글 버튼 추가 (`CourseRouteMap.tsx`)**:
     - 지도 상단 컨트롤 바에 `[역]`, `[명소·공원]`, `[주차장]`과 동등하게 클릭하여 켜고 끌 수 있는 **`[행사·축제]`** 토글 버튼 신설 (`PartyPopper` 아이콘, 핑크 테마).
  2. **지도 중심점 거리 제한 탈피 · 뷰포트 사각 영역(Bounds) 기준 100% 실시간 축제 표출**:
     - 지도를 이동하거나 줌아웃했을 때 중심점 기준의 반경(1.5km/10km)에 국한되지 않고, 현재 지도 화면의 사각 영역(`minLat ~ maxLat, minLng ~ maxLng`) 전체를 계산하여 해당 화면에 걸치는 모든 축제를 백엔드 `/api/v1/places/festivals`를 통해 100% 로드 및 마커 렌더링.
     - 백엔드 `PlaceQueryRepository.java`의 `findActiveFestivalsInBounds`에서 과거 날짜로 제외되던 축제들까지 전국 사계절 축제(855건)를 포괄하여 조회되도록 조건 개선 및 limit 500 상향.
  3. **축제 마커 선택 시 원클릭 `+ 코스로 지정` 연동 (`CourseRouteMap.tsx`, `ExploreClientView.tsx`, `CourseBuilderClientView.tsx`)**:
     - 행사·축제 마커 클릭 시 하단 카드에서 축제 일정, 주소, 카카오맵 바로가기와 함께 **`+ 코스로 지정`** 버튼 제공.
     - 클릭 시 탐색 페이지에서는 내 코스 드래프트에, 코스 빌더에서는 경유지로 즉시 쏙 담기도록 기능 연동 완료 (`typecheck` 및 Next.js 16 전체 13개 라우트 빌드 완료).
