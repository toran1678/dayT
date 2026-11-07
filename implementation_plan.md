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

- **현재 목표**: **지도 SSR 하이드레이션 소수점 불일치 해결 및 고정 칩 제거 후 지하철역 자동완성 텍스트 힌트 도입 완료**
- **세부 구현 계획**:
  0. **지도 Hydration 불일치 해결 (`CourseRouteMap.tsx`, `slippy-tile-math.ts`)**:
     - `latLngToContainerPx`에 `Math.round()`를 적용해 pixel 좌표를 정수화하고, 타일 핀 인라인 스타일에 `suppressHydrationWarning`을 적용하여 Next.js 서버/클라이언트 소수점 렌더링 불일치(569.004px vs 569.0036...px)를 완벽 제거
  0.1. **검색창 지하철역 텍스트 힌트 드롭다운 (`subway-search-data.ts`, `ExploreClientView.tsx`)**:
     - 고정 프리셋 칩(`성수역`, `연남동`, `한남동` 등)을 제거하고 검색창 단일화
     - 검색창 포커스 또는 입력 시 수도권 주요 데이트 역세권/상권 자동완성 텍스트 힌트 드롭다운 노출 (호선 컬러 배지, 핫스팟 태그, 방향키/Enter 선택 지원)
  1. **이미지 로딩 안정화 & Referrer 차단 방지 (`PlaceSpotlightCard.tsx`)**:
     - `<Image unoptimized referrerPolicy="no-referrer" />` 적용으로 네이버·티스토리 등 외부 블로그 403 차단 해제
     - `onError` 발생 시 카카오 CDN `thumbnailUrl` 및 카테고리별 큐레이션 이미지 다중 폴백 체인 구축
     - 이미지 좌우 넘김 버튼(`<`, `>`) 추가로 갤러리 편의성 향상
  2. **슬라이더 UI 정돈 (`ExploreClientView.tsx`)**:
     - thumb 위치와 어긋나는 중간 텍스트(`2km`, `5만`) 제거, 최소/최대 양 끝 라벨만 직관적으로 표시
  3. **지도 텍스트 제거 (`CourseRouteMap.tsx`)**:
     - 헤더의 '상세 거리·역세권 맵' 배지/전환 버튼 완전 삭제
  4. **메뉴 추천 지도 실시간 연동**:
     - '다시 추천' 클릭 시 카테고리 순환 및 추천 식당 목록을 지도 마커(`places`)에 즉시 반영하고 첫 번째 추천 식당 모달 자동 팝업
  5. **스크롤 없는 풀화면 고정 지도 레이아웃**:
     - 데스크톱 기준 `lg:h-[calc(100vh-130px)] lg:overflow-hidden` 적용
     - 좌측 검색/필터 패널만 독립 스크롤되고 지도는 100% 화면에 고정되어 위아래 스크롤 제거
  6. **스팟 선택 시 팝업 창(Modal) 전환**:
     - 좌측 인라인 확장 대신 클릭 시 `PlaceSpotlightCard`가 뜨는 중앙 플로팅 모달창 구현
  7. **현 지도 재탐색 시 담은 장소 영구 유지**:
     - `mapStops`에 `draftPlaces`를 1순위(`isDraft: true`, 코스 번호)로 유지하고 새 검색 스팟을 후보로 병합하여, 다른 지역으로 이동해 재탐색해도 담은 장소가 지도에서 사라지지 않도록 보장
  8. **검증**: `npm run typecheck`, `npm run lint` 통과 확인 및 `progress.md` 갱신
