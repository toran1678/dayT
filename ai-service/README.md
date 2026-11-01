# DayT AI & Data Service (`ai-service/`)

외부 장소·축제·리뷰 데이터를 수집하고, **Gemini API**를 활용해 맞춤형 데이트 코스 추천 및 리뷰 해시태그 요약을 수행하는 **FastAPI (Python)** 마이크로서비스 폴더입니다.

## 기술 스택
- **Framework**: FastAPI (Python)
- **AI**: Google Gemini API (맞춤형 코스 추천 및 정형 JSON 추출)
- **Data Collection**: 공공데이터포털 API, 한국관광공사 TourAPI, Playwright 등

## 주요 역할
- **Gemini 기반 맞춤 코스 자동 추천**: 지역, 데이트 테마, 음식 취향, 예산, 시간·날씨 키워드를 조합해 최적 동선 코스 생성
- **리뷰 해시태그 요약**: 장소 리뷰 데이터를 분석해 `#주차가_편해요`, `#디저트_맛집` 등 핵심 해시태그 형태로 가공
- **공공·문화 데이터 수집**: 진행 중인 지역 축제, 전시·문화 행사 및 핫플레이스 데이터 수집 파이프라인

