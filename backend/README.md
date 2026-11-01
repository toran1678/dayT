# DayT Backend (`backend/`)

인증, 데이트 코스 관리, 실시간 공동 편집, 커플 펫 및 일기장 등 핵심 비즈니스 로직을 담당하는 **Spring Boot** 메인 API 서버 폴더입니다.

## 기술 스택
- **Framework**: Spring Boot (Java)
- **ORM / DB**: Spring Data JPA / MySQL (또는 PostgreSQL)
- **Security**: Spring Security + JWT + OAuth2 (카카오 / 구글 로그인)
- **Cache & Realtime**: Redis (장소 검색 캐싱, 세션/토큰 관리), WebSocket / SSE (실시간 공동 코스 편집)

## 주요 담당 도메인
- **`user`**: 회원 관리, 소셜 로그인, 커플 매칭 연결
- **`place`**: 지역·카테고리 기반 장소 조회 및 해시태그 요약 데이터 제공
- **`course`**: 커스텀 코스 CRUD, 방문 순서(`Course_Place_Mapping`), 구글 '내 지도(My Maps)' 연동용 KML 포맷 Export
- **`collaboration`**: 공유 링크 기반 실시간 공동 코스 편집 동기화
- **`recommendation`**: AI 서버(`ai-service`) 연동 맞춤형 코스 추천 중계
- **`pet` & `diary`**: 커플 캐릭터 성장·미션·미니게임 및 데이트 일기장 관리

