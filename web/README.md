# DayT Web (`web/`)

사용자가 데이트 코스를 탐색·제작·공유하고 커플 활동을 기록하는 **DayT 주력 반응형 웹 애플리케이션 (`Next.js`)** 폴더입니다.

## 기술 스택
- **Framework**: Next.js 16 (App Router + TypeScript + Tailwind CSS v4)
- **API Contract**: `openapi-typescript` (`../docs/api-spec.yaml` → `src/shared/types/api.d.ts` 자동 생성)
- **Map API**: Google Maps JavaScript API + 카카오 로컬/모빌리티 연동

## 반응형 레이아웃 구조
- **데스크톱 (`lg` 이상)**: 좌측 고정 사이드바 + 상단 헤더 + 넓은 지도/카드 대시보드
- **모바일 웹 (`lg` 미만)**: 상단 컴팩트 바 + 풀스크린 컨텐츠 + 하단 고정 앱 탭바 (`Bottom Navigation`)

## 주요 명령어
```powershell
# API 명세 변경 시 TypeScript 타입 재생성
npm run gen:api

# 개발 서버 실행 (http://localhost:3000)
npm run dev

# 타입 검사
npm run typecheck
```
