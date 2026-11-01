# Agent Backend Integration & API Rules

## 1. API 명세 준수 원칙 (Source of Truth)
- 모든 API 통신 및 데이터 연동은 반드시 프로젝트 내의 API 명세서 파일(`docs/api-spec.yaml`, `swagger.json`, 또는 지정된 명세 문서)을 절대적인 기준으로 삼습니다.
- 에이전트 임의로 API 엔드포인트 경로(`/api/v1/...`), HTTP 메서드(`GET`, `POST`, `PUT`, `DELETE`), 요청/응답 필드명을 변경하거나 새로 생성할 수 없습니다.
- 명세에 없는 필드가 필요하거나 변경이 필요한 경우, 코드를 임의로 수정하기 전 반드시 사용자에게 명세 변경 필요성을 보고하고 승인을 받아야 합니다.

## 2. 데이터 계약 (DTO 및 타입 안정성)
- 프론트엔드/백엔드 연동 시 사용하는 데이터 구조(TypeScript Interface, DTO, Pydantic 모델 등)는 API 명세의 스키마와 1:1로 일치해야 합니다.
- API 응답 타입은 임의로 `any`를 사용하거나 축약하지 말고, 명세서에 정의된 타입(Nullable 여부 포함)을 엄격하게 반영하세요.

