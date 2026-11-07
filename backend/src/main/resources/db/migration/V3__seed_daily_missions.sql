-- =====================================================================
-- DayT Daily Missions Seed (V3)
-- Idempotent seed for Grow Together daily couple missions
-- =====================================================================

INSERT INTO daily_missions (title, description, reward_exp, is_active)
SELECT v.title, v.description, v.reward_exp, TRUE
FROM (VALUES
    ('오늘 마신 음료 두 잔 나란히 사진 남기기', '카페나 식당에서 함께 주문한 메뉴를 나란히 찍어 추억을 남겨보세요.', 15),
    ('함께 짠 데이트 코스 첫 경유지 방문하기', '코스 보관함에 저장한 데이트 루트의 첫 번째 스팟에 도착해 인증해보세요.', 20),
    ('집으로 돌아가는 길에 세 줄 데이트 일기 남기기', '오늘 가장 기억에 남는 순간을 일기장에 짧게 기록해보세요.', 25),
    ('서로 가장 마음에 든 공간에서 인생샷 찍어주기', '오늘 방문한 장소 중 분위기가 가장 좋았던 곳에서 서로 사진을 남겨주세요.', 20),
    ('다음 데이트에 가고 싶은 동네 하나 정하기', '데이트 탐색 탭을 함께 보며 다음 주말에 가볼 역이나 동네를 골라보세요.', 15),
    ('도보 이동 중 손잡고 10분 산책하기', '경유지 사이를 걸으며 오늘 나눈 대화 중 가장 재밌었던 이야기를 꼽아보세요.', 15)
) AS v(title, description, reward_exp)
WHERE NOT EXISTS (SELECT 1 FROM daily_missions);

