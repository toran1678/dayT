---
trigger: always_on
---

# DayT Plan & Progress Workflow Rules

- **단일 진행 관리 (`tasks.md` 미사용)**: 별도의 `tasks.md`를 생성하지 않고, 설계·계획은 `implementation_plan.md`, 할 일 체크리스트와 이력은 `progress.md` 두 파일로만 관리한다.
- **작업 착수 시**: 새로운 기능·단계를 구현하기 전에 `progress.md`(현재 포커스·미완료 항목)와 `implementation_plan.md`(`3. 현재 작업 계획`)를 확인하고, 중대형 기능 착수 시 `implementation_plan.md`의 `3. 현재 작업 계획`을 먼저 갱신한다.
- **작업 완료 시**: 의미 있는 기능·세팅 구현이 끝나면 `progress.md`의 체크박스(`[ ]` → `[-]` → `[x]`), `현재 포커스`, `작업 완료 로그`(1~2줄 요약)를 최신 상태로 업데이트한다.
- **토큰 절약 예외**: 단순 질의응답, 설명 요청, 사소한 오타·스타일 수정 시에는 두 파일을 불필요하게 읽거나 갱신하지 않는다.

