import os
import urllib.parse
import json
import httpx
from dotenv import load_dotenv

load_dotenv()
raw_key = os.getenv("TOUR_API_SERVICE_KEY", "")
unquoted_key = urllib.parse.unquote(raw_key)

url = "https://apis.data.go.kr/B551011/KorService2/searchFestival2"
page_no = 1
num_of_rows = 100
all_festivals = []

print("Fetching all festivals from Korea Tourism Organization KorService2...")

while page_no <= 10:
    params = {
        "serviceKey": unquoted_key,
        "MobileOS": "ETC",
        "MobileApp": "DayT",
        "_type": "json",
        "eventStartDate": "20260101",
        "numOfRows": num_of_rows,
        "pageNo": page_no,
    }
    try:
        resp = httpx.get(url, params=params, timeout=20)
        if resp.status_code != 200:
            print(f"Page {page_no} HTTP error: {resp.status_code}")
            break
        data = resp.json()
        body = data.get("response", {}).get("body", {})
        total_count = body.get("totalCount", 0)
        items = body.get("items", {}).get("item", [])
        if isinstance(items, dict):
            items = [items]
        if not items:
            break
        all_festivals.extend(items)
        print(f"Page {page_no}: fetched {len(items)} items (accumulated: {len(all_festivals)} / total: {total_count})")
        if page_no * num_of_rows >= total_count:
            break
        page_no += 1
    except Exception as exc:
        print(f"Page {page_no} exception: {exc}")
        break

print(f"Total raw festivals collected: {len(all_festivals)}")

# Generate Flyway V5 Migration SQL
sql_lines = [
    "-- =====================================================================",
    "-- DayT V5: Seed Real TourAPI Festivals directly fetched via User Key",
    f"-- Total {len(all_festivals)} real festivals from Korea Tourism Organization KorService2",
    "-- =====================================================================",
    "",
    "-- 1. Update old V4 seed festivals visitkorea home URLs to KakaoMap official link scheme",
    "UPDATE places SET place_url = CONCAT('https://map.kakao.com/link/map/', REPLACE(name, ' ', '%20'), ',', latitude, ',', longitude) "
    "WHERE external_provider = 'TOUR_API' AND (place_url IS NULL OR place_url LIKE '%visitkorea.or.kr%');",
    "",
    "-- 2. Insert or update all real festivals",
    "INSERT INTO places (",
    "    external_provider, external_place_id, name, category_group, food_category, sub_category,",
    "    address, region_keyword, latitude, longitude, location, phone, place_url, thumbnail_url,",
    "    avg_price_per_person, is_indoor, hashtags, recommended_menus, ai_summary,",
    "    event_start_date, event_end_date",
    ") VALUES",
]

values_list = []
seen_ids = set()

for it in all_festivals:
    cid = str(it.get("contentid", "")).strip()
    if not cid or cid in seen_ids:
        continue
    seen_ids.add(cid)

    title = str(it.get("title", "")).strip().replace("'", "''")
    addr = str(it.get("addr1", "")).strip().replace("'", "''")
    mapx = str(it.get("mapx", "")).strip()
    mapy = str(it.get("mapy", "")).strip()

    try:
        lng = float(mapx)
        lat = float(mapy)
    except Exception:
        continue

    # Coordinate validation for South Korea
    if lng < 124.0 or lng > 132.0 or lat < 33.0 or lat > 39.0:
        continue

    ext_id = f"tour_{cid}"
    s_date = str(it.get("eventstartdate", "")).strip()
    e_date = str(it.get("eventenddate", "")).strip()
    start_date_sql = f"'{s_date[:4]}-{s_date[4:6]}-{s_date[6:8]}'" if len(s_date) == 8 else "NULL"
    end_date_sql = f"'{e_date[:4]}-{e_date[4:6]}-{e_date[6:8]}'" if len(e_date) == 8 else "NULL"

    tel = str(it.get("tel", "")).strip().replace("'", "''")
    tel_sql = f"'{tel[:30]}'" if tel else "NULL"

    img = str(it.get("firstimage", "")).strip().replace("'", "''")
    img_sql = f"'{img}'" if img else "NULL"

    # Region keyword from address (e.g. "서울 송파구", "울산 남구")
    tokens = addr.split()
    reg = (tokens[0] + " " + tokens[1]) if len(tokens) >= 2 else (tokens[0] if tokens else "국내축제")
    reg = reg.replace("'", "''")

    # KakaoMap official link scheme with pinpoint: https://map.kakao.com/link/map/{name},{latitude},{longitude}
    enc_name = urllib.parse.quote(it.get("title", ""))
    kakaomap_url = f"https://map.kakao.com/link/map/{enc_name},{lat:.6f},{lng:.6f}"

    tags = ["#전국축제", "#데이트행사", f"#{reg.replace(' ', '')}", "#TourAPI"]
    hashtags_json = json.dumps(tags, ensure_ascii=False)
    hashtags_sql = f"'{hashtags_json}'::jsonb"

    summary = f"{addr} 일대에서 개최되는 축제 ''{title}''예요.".replace("'", "''")

    val = (
        f"('TOUR_API', '{ext_id}', '{title}', 'EXHIBITION', NULL, '축제·행사', "
        f"'{addr}', '{reg}', {lat:.6f}, {lng:.6f}, "
        f"ST_SetSRID(ST_MakePoint({lng:.6f}, {lat:.6f}), 4326)::geography, "
        f"{tel_sql}, '{kakaomap_url}', {img_sql}, 0, FALSE, "
        f"{hashtags_sql}, '[]'::jsonb, '{summary}', {start_date_sql}, {end_date_sql})"
    )
    values_list.append(val)

sql_lines.append(",\n".join(values_list))
sql_lines.append("ON CONFLICT (external_provider, external_place_id) DO UPDATE SET")
sql_lines.append("    name = EXCLUDED.name,")
sql_lines.append("    address = EXCLUDED.address,")
sql_lines.append("    region_keyword = EXCLUDED.region_keyword,")
sql_lines.append("    latitude = EXCLUDED.latitude,")
sql_lines.append("    longitude = EXCLUDED.longitude,")
sql_lines.append("    location = EXCLUDED.location,")
sql_lines.append("    phone = EXCLUDED.phone,")
sql_lines.append("    place_url = EXCLUDED.place_url,")
sql_lines.append("    thumbnail_url = EXCLUDED.thumbnail_url,")
sql_lines.append("    ai_summary = EXCLUDED.ai_summary,")
sql_lines.append("    event_start_date = EXCLUDED.event_start_date,")
sql_lines.append("    event_end_date = EXCLUDED.event_end_date,")
sql_lines.append("    updated_at = NOW();")

out_file = r"backend\src\main\resources\db\migration\V5__seed_real_tour_api_festivals.sql"
with open(out_file, "w", encoding="utf-8") as f:
    f.write("\n".join(sql_lines) + "\n")

print(f"Generated {out_file} successfully! Total valid festivals written: {len(values_list)}")

