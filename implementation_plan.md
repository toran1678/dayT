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

- **현재 목표**: **헤더 타이틀 텍스트 색상 분리, 지도 높이 확대 복원, 드래그 중 도보 시간 실시간 떨림 완전 방지, 지도 주변 버튼·텍스트 크기 확대, 담은 코스 상시 화이트 카드 UI 개편 완료**
- **세부 구현 내역**:
  1. **헤더 타이틀 감성 컬러 강조 (`ExploreClientView.tsx`)**:
     - `오늘은 어떤 하루를` 기본 진한 텍스트 + `<span className="text-primary font-black">함께 만들어 볼까요?</span>` 브랜드 컬러 강조 적용
  2. **지도 높이 확대 복원 (`ExploreClientView.tsx`, `CourseRouteMap.tsx`)**:
     - 직전에 너무 축소되었던 높이를 `h-[520px] lg:h-[600px] min-h-[460px]`로 상향 조정하여 데스크톱에서 시원한 뷰포트 확보
  3. **지도 드래그 중 주변 역 도보 시간 떨림 완전 차단 (`CourseRouteMap.tsx`)**:
     - `settledCenter` 상태를 도입하고 드래그 중(`isDragging === true`)에는 도보 시간 재계산을 정지, 마우스 업(`pointerup`/`idle`) 시에만 중심점을 고정 계산하도록 분리
  4. **지도 주변 버튼·레이블·컨트롤 크기 확대 (`CourseRouteMap.tsx`)**:
     - 상단 헤더(`text-sm font-black`), 테마 칩(`px-3 py-1 text-xs`), 주변 역 버튼(`px-3 py-1 text-xs font-bold`), 레이어 토글 칩(`px-3 py-1 text-xs font-black`), 줌 컨트롤(+/-: `h-9 w-9`), "이 지역에서 다시 탐색" 플로팅 버튼(`px-5 py-2.5 text-xs sm:text-sm font-black`) 확대
  5. **담은 코스 패널 상시 노출 & 화이트 카드 개편 (`ExploreClientView.tsx`)**:
     - 기존의 붉은 배경(`bg-primary-soft/40`) 제거 및 탐색창과 통일된 화이트 카드(`bg-surface border-line shadow-[0_10px_32px_rgba(24,24,27,0.03)]`) 적용
     - 담은 장소가 0개일 때도 상시 노출하여 직관적인 안내 가이드 제공
     - 담은 장소 칩에 카테고리 SVG 아이콘 + 장소명(클릭 시 모달 팝업) + 개별 삭제(`X`) 및 전체 취소 기능 제공
  6. **검증**: `npm run typecheck`, `npm run lint` 통과 확인 (0 error / 0 warning) 및 `progress.md` 갱신
