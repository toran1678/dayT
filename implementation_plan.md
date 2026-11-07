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

- **현재 목표**: **전역 SVG 아이콘 일원화 · 지도 이동 시 역/명소·공원/주차장 실시간 표시 · 현 지도 조건 유지 재탐색 · SSR 하이드레이션 일치 수정**
- **세부 구현 계획**:
  1. **SSR/클라이언트 Hydration 불일치 완전 해결 (`draft-course-storage.ts`, `ExploreClientView.tsx`, `CourseBuilderClientView.tsx`)**:
     - `useSyncExternalStore`(`getServerSnapshot` 빈 배열 반환) 기반 `useDraftPlaces()` 훅을 도입해 서버 렌더링 HTML과 초기 하이드레이션 트리를 100% 일치시킴
  2. **이모지·유니코드 기호 → 순수 SVG 아이콘 교체 (`PetStageIcon.tsx`, `AppShell.tsx`, `TogetherClientView.tsx`, `ExploreClientView.tsx`, `CourseRouteMap.tsx`)**:
     - 커플 펫 성장 단계별 전용 벡터 SVG 컴포넌트(`PetStageIcon`) 신설 및 주차장(`SquareParking`), 명소·공원(`Trees`·`Landmark`), 지하철역(`TrainFront`), 메뉴 추천기(`UtensilsCrossed`), 요약(`Sparkles`) 등 모든 이모지·특수문자를 SVG로 전환
  3. **지도 이동(Pan/Zoom) 시 주변 정보(역·명소/공원·주차장) 상시 자동 로드 (`CourseRouteMap.tsx`, `web/src/app/api/map/context/route.ts`)**:
     - `역`·`명소·공원`·`주차장` 레이어를 모두 기본 활성화(`true`)하고, 공원 키워드 보강 및 지도 중심 이동 디바운스 조회를 적용해 지도를 어느 지역으로 옮기든 주변 정보가 즉시 표시되도록 개선
  4. **현 지도 영역 조건 유지 재탐색 버튼 (`CourseRouteMap.tsx`, `ExploreClientView.tsx`)**:
     - 탐색 기준점으로부터 지도를 이동했을 때 상단 중앙에 **`이 지역에서 다시 탐색`** 플로팅 버튼을 노출하고, 클릭 시 기존 선택 필터(카테고리·반경·1인 예산·실내 여부) 그대로 이동한 좌표의 데이트 스팟을 재조회하도록 연결
  5. **검증**: `npm run typecheck`, `npm run lint` 통과 확인 및 `progress.md` 반영
