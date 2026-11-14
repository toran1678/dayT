# DayT 구현 계획서 (Implementation Plan)

> **기준 문서**: [docs/prd.md](./docs/prd.md) · [docs/erd.md](./docs/erd.md) · [docs/api-spec.yaml](./docs/api-spec.yaml)  
> **진행 현황 체크리스트**: [progress.md](./progress.md) (`tasks.md` 별도 생성 없이 `progress.md`에서 통합 관리)

---

## 1. 전체 개발 로드맵 (Phases)

| 단계        | 목표                                      | 핵심 범위                                                                                                                                    |
| :---------- | :---------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase 0** | 기획 · 설계 · 하네스 구축                 | PRD, PostGIS ERD, OpenAPI 3.0 명세 확정, 에이전트 API/워크플로우 가드레일 설정                                                               |
| **Phase 1** | 인프라 & 서비스 스캐폴딩                  | `docker-compose`(PostgreSQL 16 + PostGIS, Redis), `backend`(Spring Boot), `ai-service`(FastAPI), `web`(Next.js TS + API 타입 생성) 초기 세팅 |
| **Phase 2** | **P0 핵심 MVP** (`F-01`~`F-05`)           | 반응형 웹 대시보드 기반 소셜 로그인(JWT) → 지역·음식 장소 탐색(PostGIS·Redis) → 커스텀 코스 CRUD → 지도 마커·폴리라인 동선 렌더링            |
| **Phase 3** | **P1 AI · 공유 고도화** (`F-06`~`F-10`)   | 공공/리뷰 수집 및 Gemini 해시태그 요약 → 조건 맞춤 AI 코스 자동 추천 → 카톡 공유 & 구글맵 원클릭 길안내                                      |
| **Phase 4** | **P2 실시간 · 커플 확장** (`F-11`~`F-14`) | KML 내보내기, STOMP 실시간 공동 코스 편집(`/ws/collab`), 커플 연결·펫 성장·데이트 일기장                                                     |
| **Phase 5** | **모바일 앱 확장** _(추후)_               | `web/`의 API 타입·비즈니스 로직을 재사용하여 `mobile/`(Expo React Native) 네이티브 앱으로 이식                                               |

---

## 2. 구현 원칙 (Architecture Guardrails)

- **클라이언트 전략 (Web-First + 완벽한 모바일 반응형)**: 주력 프론트엔드는 `web/`(Next.js)로 먼저 구현하되, 데스크톱(`lg` 이상)에서는 **상단 세그먼트 필(Pill) 네비게이션 + 풀와이드 맵 분할 뷰**, 스마트폰 브라우저(`lg` 미만)에서는 **플로팅 글래스 하단 독(Bottom Dock) 중심의 모바일 앱 뷰**로 자동 전환되도록 전 화면을 반응형으로 설계한다. (완성 후 API 타입·비즈니스 로직을 재사용해 `mobile/` Expo 앱으로 확장)
- **DB & 공간 연산**: 일반 `postgres` 이미지 대신 **`postgis/postgis:16-3.4`** 를 사용해 `GEOGRAPHY(Point, 4326)` 반경 탐색과 `JSONB` 해시태그 인덱싱을 지원한다.
- **환각(Hallucination) 방지 파이프라인**: AI 코스 추천 시 LLM이 임의로 장소를 지어내지 못하도록, 반드시 `backend`가 DB 내 실존 후보 장소를 먼저 추려 `ai-service`(`InternalAiCourseGenerateRequest`)에 전달한다.
- **계약 우선(Contract-First)**: 모든 DTO·Pydantic·TS 타입은 `docs/api-spec.yaml`과 1:1 일치시킨다.

---

## 3. 현재 작업 계획 (Active Plan)

> _새로운 기능이나 단계(Phase) 구현에 착수할 때 에이전트가 아래 섹션을 현재 작업의 세부 설계(대상 파일, 구현 순서, 검증 방법)로 갱신합니다._

- **현재 목표**: **지도 상단 레이어에 '행사·축제' 토글 버튼 추가 및 코스 지정 기능 구현 · 지도 화면 바운드(Viewport Bounds) 내 전 축제 100% 표출**
- **세부 구현 내역**:
  1. **백엔드 바운드 축제 쿼리 최적화 (`backend/src/main/java/com/dayt/domain/place/repository/PlaceQueryRepository.java`)**:
     - `findActiveFestivalsInBounds`에서 `p.event_end_date >= CURRENT_DATE`의 과도한 날짜 제한을 완화하여, TourAPI로 수집된 전국의 모든 사계절 축제·행사(`sub_category = '축제·행사'` 또는 `category_group = 'EXHIBITION' AND event_start_date IS NOT NULL`)가 지도 뷰포트 사각 영역(`minLat ~ maxLat, minLng ~ maxLng`) 안에 들어오면 100% 반환되도록 개선.
     - `limitCount` 기본 제한을 500개로 넉넉하게 상향.
  2. **지도 컴포넌트(`CourseRouteMap.tsx`) '행사·축제' 레이어 버튼 & 코스 지정 연동**:
     - 지도 상단 컨트롤 바(`역`, `명소·공원`, `주차장`) 옆에 **`행사·축제`** 레이어 버튼 신설 (`PartyPopper` 아이콘, 핑크 컬러).
     - 지도 뷰포트 바운드(`map.getBounds()`)를 기반으로 현재 화면 안에 위치한 축제들을 실시간 로드 및 마커 렌더링.
     - 축제 마커 클릭 시 하단 정보창에 카카오맵 바로가기와 함께 **`+ 코스에 추가` (`onAddPlaceToCourse`)** 액션 버튼 제공.
  3. **데이트 탐색 페이지(`ExploreClientView.tsx`) 연동**:
     - `CourseRouteMap`의 `onAddPlaceToCourse`를 `handleAddDraftPlace`와 연결하여, 지도에서 행사·축제 버튼을 켜고 원하는 축제를 탭했을 때 즉시 현재 코스 후보로 추가할 수 있도록 구현.
     - 중심점 반경(2km/10km)에 갇히지 않고 지도 화면 내 모든 축제가 표시되도록 뷰포트 기반 데이터 연동.
  4. **검증**:
     - 백엔드 쿼리 검증 및 프론트엔드 타입체크/빌드 통과 확인.
     - 지도 이동 및 줌 레벨 변경 시 화면 내 축제 핀 노출 및 코스 담기 동작 확인.
