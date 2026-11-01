# DayT API & Data Contract Rules

## 1. 기준 문서 (SSoT) 및 변경 절차
- **기준 문서**: API는 `docs/api-spec.yaml`, DB는 `docs/erd.md`, 기획은 `docs/prd.md`를 단일 기준으로 삼는다.
- **임의 수정 금지**: 기준 문서에 없는 경로·메서드·필드를 독자 추가하거나, 터미널 명령으로 기준 문서를 우회 수정하지 않는다.
- **불일치 처리**:
  - **구현 오류(기본)**: 기준 문서를 유지하고 코드(TS 타입, DTO, Entity, Pydantic)를 명세에 맞춰 수정한다.
  - **명세 변경 필요 시**: ① 변경 사유·필드·영향 범위를 먼저 보고 → ② 사용자 승인(`force_ask`) 후 문서 수정 → ③ 관련 계층 일괄 반영.

## 2. 데이터 계약 규칙
- **통신 경계**: Client ↔ Backend `/api/v1/...` (협업 WS: `/ws/collab`), Backend ↔ AI `/internal/ai/v1/...`
- **1:1 스키마 일치**: 필드명(`camelCase`), 타입, `required`, `nullable`, `enum`, 에러(`ErrorResponse`)를 엄수하며 `any` 사용을 금지한다. FastAPI 모델도 `camelCase` 직렬화(`alias_generator=to_camel`, `populate_by_name=True`)를 적용한다.

## 3. 가벼운 검증 원칙 (토큰·실행 최소화)
- API/DB 구현 시 `docs/api-spec.yaml`·`docs/erd.md` 전체를 매번 읽지 않고 **작업 중인 엔드포인트·테이블 구간만 부분 조회**해 대조한다.
- `openapi-typescript` 타입 생성은 매 코드 수정 시가 아니라 **초기 세팅 및 `api-spec.yaml` 변경 시에만** 실행한다.
