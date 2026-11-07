export interface SubwayStationHint {
  id: string;
  name: string;
  lines: { label: string; color: string }[];
  areaHint: string;
  aliases: string[];
}

export const SUBWAY_HINT_STATIONS: SubwayStationHint[] = [
  // 성수 / 서울숲 / 건대
  {
    id: "seongsu",
    name: "성수역",
    lines: [{ label: "2호선", color: "#00A84D" }],
    areaHint: "성수동 카페거리 · 팝업스토어",
    aliases: ["성수", "카페거리", "성수연방", "아더에러"],
  },
  {
    id: "seoul-forest",
    name: "서울숲역",
    lines: [{ label: "수인분당", color: "#F5A200" }],
    areaHint: "서울숲 공원 · 아틀리에길",
    aliases: ["서울숲", "아틀리에", "갤러리아포레"],
  },
  {
    id: "ttukseom",
    name: "뚝섬역",
    lines: [{ label: "2호선", color: "#00A84D" }],
    areaHint: "뚝섬 갈비골목 · 성수 북부",
    aliases: ["뚝섬", "상원길"],
  },
  {
    id: "konkuk",
    name: "건대입구역",
    lines: [
      { label: "2호선", color: "#00A84D" },
      { label: "7호선", color: "#747F00" },
    ],
    areaHint: "건대 맛의거리 · 커먼그라운드",
    aliases: ["건대", "커먼그라운드", "자양동"],
  },

  // 홍대 / 연남 / 망원 / 합정 / 상수
  {
    id: "hongik",
    name: "홍대입구역",
    lines: [
      { label: "2호선", color: "#00A84D" },
      { label: "경의중앙", color: "#77C4A3" },
      { label: "공항철도", color: "#0090D2" },
    ],
    areaHint: "홍대 걷고싶은거리 · 연트럴파크 입구",
    aliases: ["홍대", "연트럴", "서교동", "동교동"],
  },
  {
    id: "gajwa",
    name: "가좌역",
    lines: [{ label: "경의중앙", color: "#77C4A3" }],
    areaHint: "연남동 끝자락 · 경의선숲길",
    aliases: ["연남", "연남동", "가좌"],
  },
  {
    id: "mangwon",
    name: "망원역",
    lines: [{ label: "6호선", color: "#CD7C2F" }],
    areaHint: "망리단길 · 망원시장 · 한강공원",
    aliases: ["망원", "망리단길", "망원시장"],
  },
  {
    id: "hapjeong",
    name: "합정역",
    lines: [
      { label: "2호선", color: "#00A84D" },
      { label: "6호선", color: "#CD7C2F" }],
    areaHint: "합정 카페거리 · 메세나폴리스",
    aliases: ["합정", "메세나폴리스", "토정로"],
  },
  {
    id: "sangsu",
    name: "상수역",
    lines: [{ label: "6호선", color: "#CD7C2F" }],
    areaHint: "상수동 골목 카페 · 당인리 문화창작발전소",
    aliases: ["상수", "당인리"],
  },

  // 이태원 / 한남 / 용산
  {
    id: "itaewon",
    name: "이태원역",
    lines: [{ label: "6호선", color: "#CD7C2F" }],
    areaHint: "세계음식거리 · 경리단길 입구",
    aliases: ["이태원", "경리단길", "해방촌"],
  },
  {
    id: "hangangjin",
    name: "한강진역",
    lines: [{ label: "6호선", color: "#CD7C2F" }],
    areaHint: "한남동 카페거리 · 리움미술관",
    aliases: ["한남동", "한남", "리움", "블루스퀘어"],
  },
  {
    id: "shinyongsan",
    name: "신용산역",
    lines: [{ label: "4호선", color: "#00A4E3" }],
    areaHint: "용리단길 맛집골목 · 아모레퍼시픽",
    aliases: ["용리단길", "아모레", "신용산"],
  },
  {
    id: "samgakji",
    name: "삼각지역",
    lines: [
      { label: "4호선", color: "#00A4E3" },
      { label: "6호선", color: "#CD7C2F" },
    ],
    areaHint: "용리단길 북부 · 전쟁기념관",
    aliases: ["삼각지", "대구탕골목"],
  },

  // 강남 / 신사 / 압구정
  {
    id: "gangnam",
    name: "강남역",
    lines: [
      { label: "2호선", color: "#00A84D" },
      { label: "신분당", color: "#D4003B" },
    ],
    areaHint: "강남대로 번화가 · 테헤란로",
    aliases: ["강남", "강남대로", "역삼동"],
  },
  {
    id: "sinnonhyeon",
    name: "신논현역",
    lines: [
      { label: "9호선", color: "#BDB092" },
      { label: "신분당", color: "#D4003B" },
    ],
    areaHint: "논현동 먹자골목 · 교보타워",
    aliases: ["신논현", "교보문고", "논현"],
  },
  {
    id: "sinsa",
    name: "신사역",
    lines: [
      { label: "3호선", color: "#EF7C1C" },
      { label: "신분당", color: "#D4003B" },
    ],
    areaHint: "신사동 가로수길 · 세로수길",
    aliases: ["신사", "가로수길", "세로수길"],
  },
  {
    id: "apgujeong-rodeo",
    name: "압구정로데오역",
    lines: [{ label: "수인분당", color: "#F5A200" }],
    areaHint: "도산공원 카페거리 · 압구정 로데오",
    aliases: ["압구정로데오", "도산공원", "청담동"],
  },
  {
    id: "apgujeong",
    name: "압구정역",
    lines: [{ label: "3호선", color: "#EF7C1C" }],
    areaHint: "현대백화점 본점 · 신사 가로수길 북부",
    aliases: ["압구정", "현대본점"],
  },

  // 종로 / 을지로 / 광화문 / 서촌 / 북촌
  {
    id: "hyehwa",
    name: "혜화역",
    lines: [{ label: "4호선", color: "#00A4E3" }],
    areaHint: "대학로 연극거리 · 마로니에공원",
    aliases: ["혜화", "대학로", "마로니에", "낙산공원"],
  },
  {
    id: "anguk",
    name: "안국역",
    lines: [{ label: "3호선", color: "#EF7C1C" }],
    areaHint: "북촌한옥마을 · 삼청동 · 인사동",
    aliases: ["안국", "북촌", "삼청동", "인사동"],
  },
  {
    id: "gyeongbokgung",
    name: "경복궁역",
    lines: [{ label: "3호선", color: "#EF7C1C" }],
    areaHint: "서촌 통인시장 · 세종마을 음식문화거리",
    aliases: ["경복궁", "서촌", "통인시장"],
  },
  {
    id: "euljiro-1",
    name: "을지로입구역",
    lines: [{ label: "2호선", color: "#00A84D" }],
    areaHint: "명동거리 · 롯데백화점 본점",
    aliases: ["을지로입구", "명동", "롯데본점"],
  },
  {
    id: "euljiro-3",
    name: "을지로3가역",
    lines: [
      { label: "2호선", color: "#00A84D" },
      { label: "3호선", color: "#EF7C1C" },
    ],
    areaHint: "힙지로 인쇄골목 · 감성 와인바",
    aliases: ["을지로3가", "힙지로", "을지로"],
  },
  {
    id: "jongno-3",
    name: "종로3가역",
    lines: [
      { label: "1호선", color: "#0052A4" },
      { label: "3호선", color: "#EF7C1C" },
      { label: "5호선", color: "#996CAC" },
    ],
    areaHint: "익선동 한옥거리 · 포장마차거리",
    aliases: ["종로3가", "익선동", "피맛골"],
  },

  // 잠실 / 송파
  {
    id: "jamsil",
    name: "잠실역",
    lines: [
      { label: "2호선", color: "#00A84D" },
      { label: "8호선", color: "#E6186C" },
    ],
    areaHint: "롯데월드타워 · 석촌호수 동호/서호",
    aliases: ["잠실", "석촌호수", "롯데월드", "롯데몰"],
  },
  {
    id: "songpanaru",
    name: "송파나루역",
    lines: [{ label: "9호선", color: "#BDB092" }],
    areaHint: "송리단길 카페거리 · 방이동 먹자골목",
    aliases: ["송리단길", "방이동", "송파나루"],
  },

  // 여의도 / 영등포
  {
    id: "yeouido",
    name: "여의도역",
    lines: [
      { label: "5호선", color: "#996CAC" },
      { label: "9호선", color: "#BDB092" },
    ],
    areaHint: "더현대 서울 · IFC몰",
    aliases: ["여의도", "더현대", "IFC몰"],
  },
  {
    id: "yeouinaru",
    name: "여의나루역",
    lines: [{ label: "5호선", color: "#996CAC" }],
    areaHint: "여의도 한강공원 피크닉 · 유람선",
    aliases: ["여의나루", "한강공원", "피크닉"],
  },

  // 기타 주요 상권
  {
    id: "pangyo",
    name: "판교역",
    lines: [
      { label: "신분당", color: "#D4003B" },
      { label: "경강", color: "#003DA5" },
    ],
    areaHint: "현대백화점 판교점 · 아브뉴프랑",
    aliases: ["판교", "아브뉴프랑", "백현동"],
  },
  {
    id: "suwon",
    name: "수원역",
    lines: [
      { label: "1호선", color: "#0052A4" },
      { label: "수인분당", color: "#F5A200" },
    ],
    areaHint: "수원 로데오거리 · 행궁동 진입",
    aliases: ["수원", "행궁동", "수원로데오"],
  },
];

export const POPULAR_DEFAULT_STATIONS = [
  SUBWAY_HINT_STATIONS[0], // 성수역
  SUBWAY_HINT_STATIONS[4], // 홍대입구역
  SUBWAY_HINT_STATIONS[13], // 강남역
  SUBWAY_HINT_STATIONS[18], // 혜화역
  SUBWAY_HINT_STATIONS[10], // 한강진역 (한남동)
  SUBWAY_HINT_STATIONS[22], // 을지로3가역
];

export function searchSubwayStations(query: string, limit = 6): SubwayStationHint[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return POPULAR_DEFAULT_STATIONS.slice(0, limit);
  }

  // Remove "역" suffix for lenient matching (e.g. "성수" -> "성수역")
  const stripped = q.endsWith("역") ? q.slice(0, -1) : q;

  const results = SUBWAY_HINT_STATIONS.filter((st) => {
    const nameMatch =
      st.name.toLowerCase().includes(q) ||
      st.name.replace(/역$/, "").toLowerCase().includes(stripped);

    const lineMatch = st.lines.some((l) => l.label.toLowerCase().includes(q));
    const areaMatch = st.areaHint.toLowerCase().includes(q);
    const aliasMatch = st.aliases.some((a) =>
      a.toLowerCase().includes(stripped),
    );

    return nameMatch || lineMatch || areaMatch || aliasMatch;
  });

  return results.slice(0, limit);
}

