-- =====================================================================
-- DayT V2: Initial Curated Date Spots Seed (PostGIS + JSONB)
-- Idempotent seed across Seongsu, Yeonnam/Hongdae, Hannam, and Gangnam
-- =====================================================================

INSERT INTO places (
    external_provider, external_place_id, name, category_group, food_category, sub_category,
    address, region_keyword, latitude, longitude, location, phone, place_url, thumbnail_url,
    avg_price_per_person, is_indoor, hashtags, recommended_menus, ai_summary
) VALUES
-- 1. 성수동 · 서울숲
('KAKAO', 'seed_seongsu_101', '연무장 등심카츠 & 소바', 'RESTAURANT', '일식', '돈카츠·메밀소바',
 '서울 성동구 연무장길 38', '성수역', 37.543820, 127.054910,
 ST_SetSRID(ST_MakePoint(127.054910, 37.543820), 4326)::geography, '02-555-0101',
 'https://place.map.kakao.com/', NULL, 18000, TRUE,
 '["#첫끼추천", "#바테이블좌석", "#깔끔한분위기"]'::jsonb, '["특등심카츠", "냉메밀소바", "트러플안심카츠"]'::jsonb,
 '육즙 가득한 숙성 등심카츠와 메밀소바 조합이 깔끔해 성수 데이트 첫 식사로 만족도가 높아요.'),

('KAKAO', 'seed_seongsu_102', '오스테리아 성수 화덕파스타', 'RESTAURANT', '양식', '생면파스타·뇨끼',
 '서울 성동구 서울숲2길 29', '성수역', 37.546120, 127.043850,
 ST_SetSRID(ST_MakePoint(127.043850, 37.546120), 4326)::geography, '02-555-0102',
 'https://place.map.kakao.com/', NULL, 26000, TRUE,
 '["#기념일무드", "#뇨끼맛집", "#와인페어링"]'::jsonb, '["트러플 감자뇨끼", "비스크 생면파스타", "부라타 샐러드"]'::jsonb,
 '서울숲 골목의 아늑한 조도와 쫀득한 감자뇨끼 덕분에 소개팅·기념일 식사로 인기가 많아요.'),

('KAKAO', 'seed_seongsu_103', '성수 햇살 로스터리', 'CAFE', NULL, '스페셜티커피·타르트',
 '서울 성동구 연무장5길 14', '성수역', 37.544950, 127.052300,
 ST_SetSRID(ST_MakePoint(127.052300, 37.544950), 4326)::geography, '02-555-0103',
 'https://place.map.kakao.com/', NULL, 11000, TRUE,
 '["#통창채광", "#수제디저트", "#대화하기좋은"]'::jsonb, '["싱글오리진 핸드드립", "무화과 피스타치오 타르트"]'::jsonb,
 '오후 햇살이 깊게 들어오는 2층 통창 좌석에서 여유롭게 커피와 타르트를 즐기기 좋아요.'),

('TOUR_API', 'seed_seongsu_104', '서울숲 그라운드 미디어 전시관', 'EXHIBITION', NULL, '미디어아트·전시',
 '서울 성동구 서울숲4길 18', '성수역', 37.546900, 127.044920,
 ST_SetSRID(ST_MakePoint(127.044920, 37.546900), 4326)::geography, '02-555-0104',
 'https://place.map.kakao.com/', NULL, 15000, TRUE,
 '["#실내데이트", "#비오는날추천", "#포토존가득"]'::jsonb, '["시즌 미디어아트 관람권"]'::jsonb,
 '날씨에 구애받지 않고 몰입감 있는 빛·사운드 전시를 감상하며 인생 사진을 남기기 좋은 공간이에요.'),

('KAKAO', 'seed_seongsu_105', '서울숲 거울연못 산책로', 'PARK', NULL, '도시공원·산책',
 '서울 성동구 뚝섬로 273', '성수역', 37.544380, 127.037440,
 ST_SetSRID(ST_MakePoint(127.037440, 37.544380), 4326)::geography, '02-460-2905',
 'https://place.map.kakao.com/', NULL, 0, FALSE,
 '["#노을산책", "#피크닉명소", "#무료힐링"]'::jsonb, '[]'::jsonb,
 '식사나 카페 방문 후 나무 데크와 거울연못을 따라 나란히 걷기 좋은 대표 야외 산책 코스예요.'),

('KAKAO', 'seed_seongsu_106', '아틀리에 센트 성수 조향공방', 'ACTIVITY', NULL, '향수공방·원데이클래스',
 '서울 성동구 서울숲6길 12', '성수역', 37.547410, 127.045610,
 ST_SetSRID(ST_MakePoint(127.045610, 37.547410), 4326)::geography, '02-555-0106',
 'https://place.map.kakao.com/', NULL, 38000, TRUE,
 '["#이색데이트", "#커플향수", "#실내클래스"]'::jsonb, '["커플 시그니처 퍼퓸 50ml 클래스"]'::jsonb,
 '서로에게 어울리는 향기를 직접 시향하고 각인까지 새겨 세상에 하나뿐인 커플 향수를 만들 수 있어요.'),

-- 2. 연남동 · 홍대입구역
('KAKAO', 'seed_yeonnam_201', '연남 카미나리 텐동', 'RESTAURANT', '일식', '텐동·덮밥',
 '서울 마포구 동교로38길 26', '연남동', 37.561850, 126.925820,
 ST_SetSRID(ST_MakePoint(126.925820, 37.561850), 4326)::geography, '02-333-0201',
 'https://place.map.kakao.com/', NULL, 16000, TRUE,
 '["#바삭한텐동", "#가성비맛집", "#오픈런추천"]'::jsonb, '["에비 스페셜 텐동", "온센타마고 텐동", "유자토마토"]'::jsonb,
 '주문 즉시 튀겨내는 바삭한 새우·장어 튀김과 짭조름한 타레 소스가 일품인 연남동 텐동 전문점이에요.'),

('KAKAO', 'seed_yeonnam_202', '미로길 한우 솥밥 & 정식', 'RESTAURANT', '한식', '솥밥·모던한식',
 '서울 마포구 연희로1길 45', '연남동', 37.560920, 126.924910,
 ST_SetSRID(ST_MakePoint(126.924910, 37.560920), 4326)::geography, '02-333-0202',
 'https://place.map.kakao.com/', NULL, 19000, TRUE,
 '["#정갈한한식", "#부모님도좋아할", "#따뜻한솥밥"]'::jsonb, '["스테이크 버섯 솥밥", "전복 내장 솥밥", "감자전"]'::jsonb,
 '정갈한 1인 트레이 차림의 따뜻한 한우·전복 솥밥으로 호불호 없이 든든하게 식사하기 좋아요.'),

('KAKAO', 'seed_yeonnam_203', '연남 숯불 숙성육 정원', 'RESTAURANT', '고기', '숙성삼겹·목살',
 '서울 마포구 동교로 248', '연남동', 37.562400, 126.923950,
 ST_SetSRID(ST_MakePoint(126.923950, 37.562400), 4326)::geography, '02-333-0203',
 'https://place.map.kakao.com/', NULL, 24000, TRUE,
 '["#그릴링서비스", "#옷냄새걱정적은", "#저녁데이트"]'::jsonb, '["워터에이징 꽃목살", "숙성 삼겹살", "미나리 냉면"]'::jsonb,
 '직원이 직접 알맞게 구워주는 그릴링 서비스와 깔끔한 환기 시설로 데이트 저녁 식사에 제격이에요.'),

('KAKAO', 'seed_yeonnam_204', '브루클린 다락 카페 연남', 'CAFE', NULL, '구움과자·빈티지카페',
 '서울 마포구 성미산로29길 21', '연남동', 37.564100, 126.924400,
 ST_SetSRID(ST_MakePoint(126.924400, 37.564100), 4326)::geography, '02-333-0204',
 'https://place.map.kakao.com/', NULL, 10000, TRUE,
 '["#우드톤감성", "#휘낭시에맛집", "#아늑한조명"]'::jsonb, '["크림 브륄레 라떼", "고르곤졸라 휘낭시에"]'::jsonb,
 '따뜻한 원목 인테리어와 달콤한 크림 라떼가 매력적인 연남동 골목 감성 카페예요.'),

('KAKAO', 'seed_yeonnam_205', '경의선숲길 연트럴파크', 'PARK', NULL, '숲길·산책로',
 '서울 마포구 연남동 260-52', '연남동', 37.559810, 126.925100,
 ST_SetSRID(ST_MakePoint(126.925100, 37.559810), 4326)::geography, NULL,
 'https://place.map.kakao.com/', NULL, 0, FALSE,
 '["#저녁산책", "#소품샵투어연계", "#야외감성"]'::jsonb, '[]'::jsonb,
 '홍대입구역 3번 출구부터 이어진 푸른 산책길로 주변 소품샵·카페를 구경하며 걷기 좋아요.'),

-- 3. 한남동 · 강남역 (다양한 음식 카테고리 보강)
('KAKAO', 'seed_hannam_301', '한남 딤섬 & 우육면 클럽', 'RESTAURANT', '중식', '홍콩식딤섬·우육면',
 '서울 용산구 이태원로54길 48', '한남동', 37.536920, 127.001420,
 ST_SetSRID(ST_MakePoint(127.001420, 37.536920), 4326)::geography, '02-790-0301',
 'https://place.map.kakao.com/', NULL, 22000, TRUE,
 '["#홍콩무드", "#딤섬맛집", "#이국적분위기"]'::jsonb, '["하가우 새우딤섬", "마라 우육면", "가지튀김"]'::jsonb,
 '감각적인 홍콩 영화 무드의 인테리어에서 육즙 가득한 수제 딤섬을 즐길 수 있는 한남동 중식 다이닝이에요.'),

('KAKAO', 'seed_hannam_302', '리움 인근 모던 분식당', 'RESTAURANT', '분식', '프리미엄분식·김밥',
 '서울 용산구 이태원로55가길 22', '한남동', 37.537800, 126.999500,
 ST_SetSRID(ST_MakePoint(126.999500, 37.537800), 4326)::geography, '02-790-0302',
 'https://place.map.kakao.com/', NULL, 12000, TRUE,
 '["#가벼운한끼", "#트러플짜장떡볶이", "#깔끔한매장"]'::jsonb, '["차돌 즉석떡볶이", "묵은지 참치김밥", "김말이튀김"]'::jsonb,
 '전시 관람 전후 1만 원대 예산으로 깔끔하고 세련되게 즐기기 좋은 프리미엄 분식 공간이에요.'),

('KAKAO', 'seed_gangnam_401', '강남 크래프트 치킨 & 탭하우스', 'RESTAURANT', '치킨', '수제맥주·오븐치킨',
 '서울 강남구 강남대로102길 30', '강남역', 37.501950, 127.027620,
 ST_SetSRID(ST_MakePoint(127.027620, 37.501950), 4326)::geography, '02-552-0401',
 'https://place.map.kakao.com/', NULL, 21000, TRUE,
 '["#저녁치맥", "#수제맥주샘플러", "#활기찬분위기"]'::jsonb, '["로스트 갈릭 치킨", "수제맥주 4종 샘플러", "트러플 프라이"]'::jsonb,
 '겉바속촉 오븐 로스트 치킨과 시원한 크래프트 비어를 함께 즐기기 좋은 저녁 데이트 펍이에요.')
ON CONFLICT (external_provider, external_place_id) DO NOTHING;

