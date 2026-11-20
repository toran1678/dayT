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

- **현재 목표**: **전체 페이지 UI/UX 쇄신 (`design-taste-frontend` 기반 Anti-Slop 디자인 시스템 적용)**
- **세부 구현 내역**:
  1. **디자인 토큰 & 테마 현대화 (`web/src/app/globals.css`)**:
     - figma.com / linear.app 수준의 감각적인 웜 미니멀 팔레트(`--background: #fbfbfa`, `--surface-subtle: #f4f3f0`, `--surface-dark: #141312`, `--primary: #e15536`, `--line: #eae7e1`) 확립
     - 과도하게 부풀려진 `rounded-[28px]` 모서리를 정제된 `rounded-2xl` / `rounded-xl`로 정리하여 정밀한 제품 엣지 형성
  2. **글로벌 레이아웃 & 네비게이션 개선 (`web/src/components/layout/AppShell.tsx`)**:
     - 인위적인 Sparkles 장식을 걷어내고, 단단한 DayT 워드마크와 슬림하고 정돈된 세그먼트 네비게이션 탭으로 개편
     - 모바일 플로팅 독도 미니멀하고 직관적인 블러 도킹 UI로 마감
  3. **메인 데이트 탐색 뷰 개편 (`web/src/features/places/ExploreClientView.tsx`)**:
     - 템플릿성 AI 문구("— PLAN YOUR DAY...")를 제거하고, 명확하고 감각적인 도시 데이트 탐색 에디토리얼 헤더 도입
     - 검색바, 반경, 예산 슬라이더, 카테고리 필터를 단일 컨트롤 시스템으로 깔끔하게 매칭
     - 담은 코스 패널을 정갈한 미니멀 코스 덱으로 정돈
  4. **코스 보관함 페이지 개편 (`web/src/features/courses/MyCoursesClientView.tsx`)**:
     - 뻔한 블로그형 그리드를 탈피하고, 다가오는 D-Day 일정과 루트 동선(1 → 2 → 3)이 한눈에 보이는 세련된 카드 그리드 구축
  5. **코스 메이커 & 상세 뷰 개편 (`CourseBuilderClientView.tsx`, `CourseDetailClientView.tsx`)**:
     - 조잡한 장식을 제거하고 지도와 동선 편집 타임라인이 군더더기 없이 조화되는 프로덕트 UI 완성
  6. **커플 스페이스 & 데이트 일기장 개편 (`TogetherClientView.tsx`, `DiariesClientView.tsx`)**:
     - 유치하지 않고 따뜻한 감성의 기념일 카운터, 펫 케어, 폴라로이드 감성의 사진 일기장 아카이브 뷰 정돈
  7. **검증**: `npm run typecheck`, `npm run lint` 통과 확인 (0 error / 0 warning) 및 브라우저 렌더링 점검
