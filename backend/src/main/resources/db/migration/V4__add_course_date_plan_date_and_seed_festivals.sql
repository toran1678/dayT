-- =====================================================================
-- DayT V4: Add date_plan_date to courses & Seed TourAPI Festivals
-- Idempotent migration supporting date-based festival curation
-- =====================================================================

-- 1. courses 테이블에 데이트 계획 일자 컬럼 추가
ALTER TABLE courses ADD COLUMN IF NOT EXISTS date_plan_date DATE;

-- 2. places 테이블의 행사 기간 조회 고속화를 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_places_event_dates ON places (event_start_date, event_end_date);

-- 3. 전국 주요 핫플레이스 실존 축제 / 팝업 페스티벌 데이터 시딩 (TOUR_API 프로바이더)
INSERT INTO places (
    external_provider, external_place_id, name, category_group, food_category, sub_category,
    address, region_keyword, latitude, longitude, location, phone, place_url, thumbnail_url,
    avg_price_per_person, is_indoor, hashtags, recommended_menus, ai_summary,
    event_start_date, event_end_date
) VALUES
-- 3-1. 서울 성수동
('TOUR_API', 'tour_seongsu_fest_01', '성수 팝업 페스티벌 & 크리에이티브 마켓', 'EXHIBITION', NULL, '팝업·거리축제',
 '서울 성동구 연무장길 45', '성수역', 37.544200, 127.054100,
 ST_SetSRID(ST_MakePoint(127.054100, 37.544200), 4326)::geography, '02-499-0114',
 'https://korean.visitkorea.or.kr/', NULL, 0, FALSE,
 '["#성수팝업", "#거리축제", "#플리마켓", "#포토존"]'::jsonb, '["디자이너 굿즈", "시즌 한정 팝업 부스"]'::jsonb,
 '성수동 카페거리 일대에서 펼쳐지는 트렌디한 브랜드 팝업과 감성 플리마켓 축제예요. 볼거리와 사진 스팟이 풍성해요.',
 '2026-03-01', '2026-12-31'),

-- 3-2. 서울 홍대·연남동
('TOUR_API', 'tour_yeonnam_fest_01', '연남 경의선숲길 버스킹 & 야간 불빛 축제', 'EXHIBITION', NULL, '야외공연·조명축제',
 '서울 마포구 동교로 210', '연남동', 37.561500, 126.924200,
 ST_SetSRID(ST_MakePoint(126.924200, 37.561500), 4326)::geography, '02-3153-8114',
 'https://korean.visitkorea.or.kr/', NULL, 0, FALSE,
 '["#경의선숲길", "#야간빛축제", "#어쿠스틱버스킹", "#산책데이트"]'::jsonb, '["야간 경관 조명", "거리 어쿠스틱 라이브"]'::jsonb,
 '철길을 따라 낭만적인 야간 일루미네이션과 인디 아티스트들의 라이브 버스킹이 펼쳐지는 로맨틱한 거리 행사예요.',
 '2026-01-01', '2026-12-31'),

-- 3-3. 서울 여의도 한강공원
('TOUR_API', 'tour_yeouido_fest_01', '여의도 한강 달빛 야시장 & 드론 라이트쇼', 'EXHIBITION', NULL, '야시장·미디어쇼',
 '서울 영등포구 여의동로 330', '여의도역', 37.528400, 126.932800,
 ST_SetSRID(ST_MakePoint(126.932800, 37.528400), 4326)::geography, '02-120',
 'https://korean.visitkorea.or.kr/', NULL, 15000, FALSE,
 '["#한강데이트", "#달빛야시장", "#드론쇼", "#푸드트럭"]'::jsonb, '["수제 스테이크 푸드트럭", "야시장 칵테일"]'::jsonb,
 '시원한 한강 바람과 함께 푸드트럭 먹거리, 수공예 마켓, 밤하늘을 수놓는 드론 미디어쇼를 만끽할 수 있는 대표 축제예요.',
 '2026-04-01', '2026-10-31'),

-- 3-4. 인천 송도 센트럴파크
('TOUR_API', 'tour_songdo_fest_01', '송도 센트럴파크 수상 빛축제 & 보트 페스티벌', 'EXHIBITION', NULL, '야경축제·수상레저',
 '인천 연수구 컨벤시아대로 160', '인천대입구역', 37.392500, 126.639200,
 ST_SetSRID(ST_MakePoint(126.639200, 37.392500), 4326)::geography, '032-850-6000',
 'https://korean.visitkorea.or.kr/', NULL, 20000, FALSE,
 '["#송도빛축제", "#문보트", "#센트럴파크", "#이국적야경"]'::jsonb, '["문보트 야간 탑승권", "빛터널 산책"]'::jsonb,
 '미래도시 송도의 이국적인 스카이라인을 배경으로 호수 위 달빛 보트와 환상적인 LED 조형물을 감상하는 축제예요.',
 '2026-01-01', '2026-12-31'),

-- 3-5. 인천 구월동
('TOUR_API', 'tour_guwol_fest_01', '구월 로데오 컬처 스트리트 페스티벌', 'EXHIBITION', NULL, '거리축제·청년마켓',
 '인천 남동구 인하로 497-15', '예술회관역', 37.444500, 126.702200,
 ST_SetSRID(ST_MakePoint(126.702200, 37.444500), 4326)::geography, '032-453-2114',
 'https://korean.visitkorea.or.kr/', NULL, 0, FALSE,
 '["#구월로데오", "#청년문화축제", "#플리마켓", "#거리공연"]'::jsonb, '["핸드메이드 소품", "길거리 버스킹 공연"]'::jsonb,
 '인천 최대 번화가 구월 로데오에서 청년 아티스트들의 핸드메이드 소품 마켓과 거리 댄스·버스킹이 어우러지는 활기찬 축제예요.',
 '2026-03-15', '2026-11-30'),

-- 3-6. 부산 해운대 / 광안리
('TOUR_API', 'tour_busan_fest_01', '광안리 M 드론라이트쇼 & 오션 버스킹', 'EXHIBITION', NULL, '드론쇼·해변축제',
 '부산 수영구 광안해변로 219', '광안역', 35.153200, 129.118700,
 ST_SetSRID(ST_MakePoint(129.118700, 35.153200), 4326)::geography, '051-610-4882',
 'https://korean.visitkorea.or.kr/', NULL, 0, FALSE,
 '["#광안리드론쇼", "#광안대교야경", "#오션뷰축제", "#토요상설"]'::jsonb, '["상설 드론 아트쇼", "해변 라이브 공연"]'::jsonb,
 '광안대교를 수놓는 웅장한 드론쇼와 파도 소리를 배경으로 한 감미로운 버스킹을 즐길 수 있는 부산 대표 해변 축제예요.',
 '2026-01-01', '2026-12-31'),

-- 3-7. 대구 동성로 / 수성못
('TOUR_API', 'tour_daegu_fest_01', '수성못 페스티벌 & 미디어 음악분수쇼', 'EXHIBITION', NULL, '호수축제·음악분수',
 '대구 수성구 용학로 35', '수성못역', 35.827600, 128.618900,
 ST_SetSRID(ST_MakePoint(128.618900, 35.827600), 4326)::geography, '053-668-1500',
 'https://korean.visitkorea.or.kr/', NULL, 0, FALSE,
 '["#수성못축제", "#음악분수", "#레이저쇼", "#대구데이트"]'::jsonb, '["수성못 영상음악분수", "호숫가 감성로드"]'::jsonb,
 '드넓은 호수 위로 솟구치는 영상 음악 분수와 호숫가 둘레길을 따라 이어지는 공예 마켓이 아름다운 대구의 힐링 축제예요.',
 '2026-04-01', '2026-11-15'),

-- 3-8. 대전 엑스포 / 성심당 중앙로
('TOUR_API', 'tour_daejeon_fest_01', '대전 으능정이 스카이로드 빛 페스티벌 & 빵 축제', 'EXHIBITION', NULL, '도심축제·미디어아트',
 '대전 중구 중앙로164번길 20', '중앙로역', 36.327800, 127.427100,
 ST_SetSRID(ST_MakePoint(127.427100, 36.327800), 4326)::geography, '042-252-7100',
 'https://korean.visitkorea.or.kr/', NULL, 10000, FALSE,
 '["#스카이로드", "#대전빵축제", "#성심당도보5분", "#미디어아트"]'::jsonb, '["시즌 한정 베이커리 부스", "초대형 천장 영상쇼"]'::jsonb,
 '머리 위 214m 초대형 LED 영상쇼와 대전 명물 빵집 부스들이 한자리에 모이는 활기 넘치는 도심 미디어 축제예요.',
 '2026-03-01', '2026-12-31'),

-- 3-9. 수원 행궁동
('TOUR_API', 'tour_suwon_fest_01', '수원화성 미디어아트 페스티벌 & 행리단길 야행', 'EXHIBITION', NULL, '역사문화축제·미디어아트',
 '경기 수원시 팔달구 정조로 825', '화서역', 37.285800, 127.015200,
 ST_SetSRID(ST_MakePoint(127.015200, 37.285800), 4326)::geography, '031-290-3600',
 'https://korean.visitkorea.or.kr/', NULL, 0, FALSE,
 '["#수원화성야행", "#행리단길", "#성벽미디어아트", "#달빛산책"]'::jsonb, '["화서문 프로젝션 맵핑", "행궁동 공방 골목길 투어"]'::jsonb,
 '유네스코 세계문화유산 수원화성 성벽에 펼쳐지는 환상적인 빛의 파노라마와 감성 넘치는 행리단길 야간 산책 축제예요.',
 '2026-05-01', '2026-11-30')

ON CONFLICT (external_provider, external_place_id) DO UPDATE SET
    name = EXCLUDED.name,
    category_group = EXCLUDED.category_group,
    sub_category = EXCLUDED.sub_category,
    address = EXCLUDED.address,
    region_keyword = EXCLUDED.region_keyword,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    location = EXCLUDED.location,
    phone = EXCLUDED.phone,
    avg_price_per_person = EXCLUDED.avg_price_per_person,
    is_indoor = EXCLUDED.is_indoor,
    hashtags = EXCLUDED.hashtags,
    recommended_menus = EXCLUDED.recommended_menus,
    ai_summary = EXCLUDED.ai_summary,
    event_start_date = EXCLUDED.event_start_date,
    event_end_date = EXCLUDED.event_end_date,
    updated_at = NOW();

