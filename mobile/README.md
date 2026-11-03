# DayT Mobile (`mobile/`)

> **진행 순서 안내**: 주력 클라이언트는 [`web/`](../web/README.md) (데스크톱 대시보드 + 모바일 반응형 Next.js 웹앱)으로 먼저 구현하며, 이후 **Phase 5**에서 `web/`의 API 자동 생성 타입과 비즈니스 로직을 재사용하여 이 폴더에 React Native(Expo) 네이티브 앱으로 확장합니다.

사용자가 데이트 코스를 탐색·제작하고, 커플 활동을 기록하는 **React Native** 모바일 애플리케이션 폴더입니다.

## 기술 스택
- **Framework**: React Native (Expo + TypeScript + Expo Router)
- **Map API**: Google Maps (`react-native-maps` 커스텀 테마 렌더링 & Deep Linking) + 카카오 로컬/모빌리티 API (장소 POI 및 경로 좌표)

## 주요 화면 및 기능
- **탐색 (`Explore`)**: 지역/지하철역, 데이트 테마, 음식 카테고리, 예산, 시간대 기반 맞춤 코스 탐색 및 동선 지도 확인
- **코스 직접 만들기 (`Course Maker`)**: 장소 Pick, 방문 순서 지정, 예상 이동 시간 및 1인 예상 비용 계산·저장
- **내 코스 (`My Courses`)**: 저장한 코스 관리, 카카오톡 공유, 원클릭 길안내 연결
- **실시간 공동 편집**: 공유 링크 접속 시 WebSocket/SSE 기반 실시간 코스 함께 짜기
- **Grow Together**: 만날 때마다 성장하는 커플 펫, 오늘의 성장 미션, 커플 미니게임
- **데이트 일기장 (`Diary`)**: 날짜별 데이트 기록 및 사진 작성

