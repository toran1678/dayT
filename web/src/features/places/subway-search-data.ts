export interface SubwayStationHint {
  id: string;
  name: string;
  lines: { label: string; color: string }[];
  areaHint: string;
  aliases: string[];
  kind?: "station" | "area";
}

export const SUBWAY_HINT_STATIONS: SubwayStationHint[] = [
  // ── [서울 핵심 핫플레이스] ──
  // 성수 / 서울숲 / 건대
  {
    id: "seongsu",
    name: "성수역",
    lines: [{ label: "2호선", color: "#00A84D" }],
    areaHint: "성수동 카페거리 · 팝업스토어",
    aliases: ["성수", "성수동", "카페거리", "성수연방", "아더에러"],
    kind: "station",
  },
  {
    id: "seoul-forest",
    name: "서울숲역",
    lines: [{ label: "수인분당", color: "#F5A200" }],
    areaHint: "서울숲 공원 · 아틀리에길",
    aliases: ["서울숲", "아틀리에", "갤러리아포레", "성수남부"],
    kind: "station",
  },
  {
    id: "ttukseom",
    name: "뚝섬역",
    lines: [{ label: "2호선", color: "#00A84D" }],
    areaHint: "뚝섬 갈비골목 · 성수 북부",
    aliases: ["뚝섬", "상원길", "성수북부"],
    kind: "station",
  },
  {
    id: "konkuk",
    name: "건대입구역",
    lines: [
      { label: "2호선", color: "#00A84D" },
      { label: "7호선", color: "#747F00" },
    ],
    areaHint: "건대 맛의거리 · 커먼그라운드",
    aliases: ["건대", "커먼그라운드", "자양동", "화양동"],
    kind: "station",
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
    aliases: ["홍대", "홍대입구", "연트럴", "서교동", "동교동", "연남동입구"],
    kind: "station",
  },
  {
    id: "yeonnam-dong",
    name: "연남동",
    lines: [{ label: "인기상권", color: "#F05454" }],
    areaHint: "연트럴파크 · 동진시장 골목 감성카페",
    aliases: ["연남", "연남동", "동진시장", "연트럴파크", "마포구연남동"],
    kind: "area",
  },
  {
    id: "hapjeong",
    name: "합정역",
    lines: [
      { label: "2호선", color: "#00A84D" },
      { label: "6호선", color: "#CD7C2F" },
    ],
    areaHint: "메세나폴리스 · 당인리 문화창작발전소",
    aliases: ["합정", "메세나폴리스", "당인리", "토정로"],
    kind: "station",
  },
  {
    id: "sangsu",
    name: "상수역",
    lines: [{ label: "6호선", color: "#CD7C2F" }],
    areaHint: "상수 카페골목 · 와우산로 인디로드",
    aliases: ["상수", "와우산로", "상수동카페"],
    kind: "station",
  },
  {
    id: "mangwon",
    name: "망원역",
    lines: [{ label: "6호선", color: "#CD7C2F" }],
    areaHint: "망원시장 · 망리단길 로컬맛집",
    aliases: ["망원", "망리단길", "망원시장", "포은로"],
    kind: "station",
  },

  // 한남 / 이태원 / 용산
  {
    id: "hangangjin",
    name: "한강진역",
    lines: [{ label: "6호선", color: "#CD7C2F" }],
    areaHint: "한남동 꼼데가르송길 · 리움미술관",
    aliases: ["한남동", "한남", "리움", "이태원로", "블루스퀘어", "꼼데길"],
    kind: "station",
  },
  {
    id: "itaewon",
    name: "이태원역",
    lines: [{ label: "6호선", color: "#CD7C2F" }],
    areaHint: "세계음식거리 · 경리단길 진입로",
    aliases: ["이태원", "경리단길", "해방촌", "우사단길"],
    kind: "station",
  },
  {
    id: "yongsan",
    name: "용산역",
    lines: [
      { label: "1호선", color: "#0052A4" },
      { label: "경의중앙", color: "#77C4A3" },
      { label: "KTX", color: "#0A2540" },
    ],
    areaHint: "아이파크몰 · 용리단길 핫플레이스",
    aliases: ["용산", "용리단길", "아이파크몰", "신용산"],
    kind: "station",
  },

  // 강남 / 신사 / 압구정
  {
    id: "gangnam",
    name: "강남역",
    lines: [
      { label: "2호선", color: "#00A84D" },
      { label: "신분당", color: "#D4003B" },
    ],
    areaHint: "강남대로 패션 · CGV 뒷골목 맛집거리",
    aliases: ["강남", "강남대로", "신논현", "역삼동"],
    kind: "station",
  },
  {
    id: "sinsa",
    name: "신사역",
    lines: [
      { label: "3호선", color: "#EF7C1C" },
      { label: "신분당", color: "#D4003B" },
    ],
    areaHint: "신사동 가로수길 · 세로수길",
    aliases: ["신사", "가로수길", "세로수길", "도산대로"],
    kind: "station",
  },
  {
    id: "apgujeong-rodeo",
    name: "압구정로데오역",
    lines: [{ label: "수인분당", color: "#F5A200" }],
    areaHint: "압구정 로데오거리 · 도산공원 카페거리",
    aliases: ["압구정", "로데오", "도산공원", "청담동"],
    kind: "station",
  },

  // 혜화(대학로) / 종로 / 익선 / 을지로
  {
    id: "hyehwa",
    name: "혜화역",
    lines: [{ label: "4호선", color: "#00A5DE" }],
    areaHint: "대학로 소극장 거리 · 낙산공원 성곽길",
    aliases: ["혜화", "대학로", "낙산공원", "마로니에", "이화동"],
    kind: "station",
  },
  {
    id: "jongno3ga",
    name: "종로3가역",
    lines: [
      { label: "1호선", color: "#0052A4" },
      { label: "3호선", color: "#EF7C1C" },
      { label: "5호선", color: "#996CAC" },
    ],
    areaHint: "익선동 한옥마을 · 포장마차거리",
    aliases: ["종로3가", "익선동", "익선", "피맛골", "인사동"],
    kind: "station",
  },
  {
    id: "euljiro3ga",
    name: "을지로3가역",
    lines: [
      { label: "2호선", color: "#00A84D" },
      { label: "3호선", color: "#EF7C1C" },
    ],
    areaHint: "힙지로 감성 골목 · 노가리골목",
    aliases: ["을지로", "을지로3가", "힙지로", "노가리골목"],
    kind: "station",
  },
  {
    id: "yeouido",
    name: "여의도역",
    lines: [
      { label: "5호선", color: "#996CAC" },
      { label: "9호선", color: "#BDB092" },
    ],
    areaHint: "더현대 서울 · 여의도 한강공원",
    aliases: ["여의도", "더현대", "더현대서울", "IFC몰", "여의나루"],
    kind: "station",
  },
  {
    id: "jamsil",
    name: "잠실역",
    lines: [
      { label: "2호선", color: "#00A84D" },
      { label: "8호선", color: "#E6186C" },
    ],
    areaHint: "석촌호수 산책로 · 롯데월드몰 · 송리단길",
    aliases: ["잠실", "석촌호수", "송리단길", "롯데월드몰", "방이동"],
    kind: "station",
  },

  // ── [인천 광역 핫플레이스] ──
  {
    id: "incheon-terminal",
    name: "인천터미널역 (구월동)",
    lines: [{ label: "인천1호선", color: "#7CA7D3" }],
    areaHint: "구월동 로데오거리 · 롯데백화점 인천점",
    aliases: ["구월동", "구월", "인천터미널", "로데오거리", "인천로데오", "남동구"],
    kind: "station",
  },
  {
    id: "guwol-dong",
    name: "구월동 로데오",
    lines: [{ label: "인천상권", color: "#7CA7D3" }],
    areaHint: "구월 로데오 광장 · 궐리단길 감성 카페거리",
    aliases: ["구월동", "구월", "궐리단길", "인천로데오", "예술회관"],
    kind: "area",
  },
  {
    id: "bupyeong",
    name: "부평역",
    lines: [
      { label: "1호선", color: "#0052A4" },
      { label: "인천1호선", color: "#7CA7D3" },
    ],
    areaHint: "부평 문화의거리 · 평리단길 카페로드",
    aliases: ["부평", "평리단길", "문화의거리", "부평지하상가", "부평테마의거리"],
    kind: "station",
  },
  {
    id: "songdo-central",
    name: "센트럴파크역 (송도)",
    lines: [{ label: "인천1호선", color: "#7CA7D3" }],
    areaHint: "송도 센트럴파크 · 트라이보울 · 수상보트",
    aliases: ["송도", "센트럴파크", "송도센트럴파크", "트라이보울", "송도국제도시"],
    kind: "station",
  },
  {
    id: "songdo-triple",
    name: "테크노파크역 (송도 트리플)",
    lines: [{ label: "인천1호선", color: "#7CA7D3" }],
    areaHint: "트리플스트리트 · 현대프리미엄아울렛 송도",
    aliases: ["트리플스트리트", "송현아", "테크노파크", "송도트리플"],
    kind: "station",
  },
  {
    id: "yeonsu-dongchun",
    name: "동춘역 (연수구)",
    lines: [{ label: "인천1호선", color: "#7CA7D3" }],
    areaHint: "연수구 스퀘어원 쇼핑몰 · 동춘 맛집타운",
    aliases: ["연수구", "연수", "동춘", "스퀘어원", "연수동"],
    kind: "station",
  },
  {
    id: "incheon-chinatown",
    name: "인천역 (차이나타운)",
    lines: [
      { label: "1호선", color: "#0052A4" },
      { label: "수인분당", color: "#F5A200" },
    ],
    areaHint: "차이나타운 · 월미바다열차 · 개항장 거리",
    aliases: ["인천역", "차이나타운", "월미도", "개항장", "신포시장", "신포동"],
    kind: "station",
  },

  // ── [부산 광역 핫플레이스] ──
  {
    id: "busan-seomyeon",
    name: "서면역 (전포)",
    lines: [
      { label: "부산1호선", color: "#F06A00" },
      { label: "부산2호선", color: "#2B9E40" },
    ],
    areaHint: "서면 1번가 · 전포 카페거리 · 삼정타워",
    aliases: ["서면", "서면역", "전포", "전리단길", "전포카페거리", "부산서면"],
    kind: "station",
  },
  {
    id: "busan-haeundae",
    name: "해운대역 (해리단길)",
    lines: [{ label: "부산2호선", color: "#2B9E40" }],
    areaHint: "해리단길 감성 카페 · 해운대 해수욕장 · 구남로",
    aliases: ["해운대", "해리단길", "구남로", "미포", "해운대해수욕장"],
    kind: "station",
  },
  {
    id: "busan-gwangan",
    name: "광안역 (광안리)",
    lines: [{ label: "부산2호선", color: "#2B9E40" }],
    areaHint: "광안리 해변로 · 광안대교 오션뷰 카페거리",
    aliases: ["광안리", "광안", "민락수변공원", "밀락더마켓", "금련산"],
    kind: "station",
  },
  {
    id: "busan-nampo",
    name: "남포역 (자갈치)",
    lines: [{ label: "부산1호선", color: "#F06A00" }],
    areaHint: "BIFF 광장 · 자갈치시장 · 용두산공원",
    aliases: ["남포동", "남포", "자갈치", "비프광장", "국제시장", "보수동"],
    kind: "station",
  },
  {
    id: "busan-centum",
    name: "센텀시티역",
    lines: [{ label: "부산2호선", color: "#2B9E40" }],
    areaHint: "신세계 센텀시티 · 영화의전당 · 벡스코",
    aliases: ["센텀", "센텀시티", "영화의전당", "벡스코", "우동"],
    kind: "station",
  },

  // ── [대구 광역 핫플레이스] ──
  {
    id: "daegu-banwoldang",
    name: "반월당역 (동성로)",
    lines: [
      { label: "대구1호선", color: "#D93F36" },
      { label: "대구2호선", color: "#00AA80" },
    ],
    areaHint: "동성로 로데오거리 · 약령시 문화거리",
    aliases: ["동성로", "반월당", "대구동성로", "약령시", "중구동성로"],
    kind: "station",
  },
  {
    id: "daegu-jungangno",
    name: "중앙로역 (교동)",
    lines: [{ label: "대구1호선", color: "#D93F36" }],
    areaHint: "교동 레트로 카페거리 · 북성로 공구골목",
    aliases: ["교동", "중앙로", "교동카페거리", "북성로", "대구교동"],
    kind: "station",
  },
  {
    id: "daegu-suseongmot",
    name: "수성못역",
    lines: [{ label: "대구3호선", color: "#FFB000" }],
    areaHint: "수성못 유원지 · 레이크뷰 카페거리",
    aliases: ["수성못", "두산동", "수성유원지", "수성랜드"],
    kind: "station",
  },

  // ── [대전 광역 핫플레이스] ──
  {
    id: "daejeon-jungangno",
    name: "중앙로역 (성심당)",
    lines: [{ label: "대전1호선", color: "#007A3D" }],
    areaHint: "성심당 본점 · 으능정이 문화거리 · 대흥동 카페거리",
    aliases: ["성심당", "으능정이", "대흥동", "은행동", "중앙로", "대전중앙로"],
    kind: "station",
  },
  {
    id: "daejeon-dunsan",
    name: "정부청사역 (둔산동)",
    lines: [{ label: "대전1호선", color: "#007A3D" }],
    areaHint: "둔산동 갤러리아 타임월드 · 둔산 로데오",
    aliases: ["둔산동", "둔산", "타임월드", "갤러리아타임월드", "시청역"],
    kind: "station",
  },
  {
    id: "daejeon-yuseong",
    name: "유성온천역 (봉명동)",
    lines: [{ label: "대전1호선", color: "#007A3D" }],
    areaHint: "봉명동 매드블럭 카페거리 · 유성 족욕체험장",
    aliases: ["유성", "봉명동", "유성온천", "매드블럭", "충남대"],
    kind: "station",
  },

  // ── [광주 광역 핫플레이스] ──
  {
    id: "gwangju-acc",
    name: "문화전당역 (충장로·동명동)",
    lines: [{ label: "광주1호선", color: "#009088" }],
    areaHint: "국립아시아문화전당 · 동명동 카페거리 · 충장로",
    aliases: ["동명동", "충장로", "문화전당", "ACC", "아시아문화전당", "광주동명동"],
    kind: "station",
  },
  {
    id: "gwangju-sangmu",
    name: "상무역 (상무지구)",
    lines: [{ label: "광주1호선", color: "#009088" }],
    areaHint: "상무지구 미식거리 · 5.18 평화공원",
    aliases: ["상무지구", "상무", "치평동", "광주상무"],
    kind: "station",
  },

  // ── [경기 & 기타 주요 도시] ──
  {
    id: "suwon-rodeo",
    name: "수원역 (로데오)",
    lines: [
      { label: "1호선", color: "#0052A4" },
      { label: "수인분당", color: "#F5A200" },
    ],
    areaHint: "수원 로데오거리 · AK플라자 · 행궁동 진입",
    aliases: ["수원", "수원역", "수원로데오", "매산로"],
    kind: "station",
  },
  {
    id: "haenggung-dong",
    name: "행궁동 (행리단길)",
    lines: [{ label: "인기상권", color: "#F05454" }],
    areaHint: "수원화성 방화수류정 · 행리단길 감성카페",
    aliases: ["행궁동", "행리단길", "화성행궁", "방화수류정", "신풍동"],
    kind: "area",
  },
  {
    id: "pangyo",
    name: "판교역",
    lines: [
      { label: "신분당", color: "#D4003B" },
      { label: "경강", color: "#003DA5" },
    ],
    areaHint: "현대백화점 판교점 · 아브뉴프랑",
    aliases: ["판교", "아브뉴프랑", "백현동", "판교테크노밸리"],
    kind: "station",
  },
  {
    id: "seohyeon",
    name: "서현역",
    lines: [{ label: "수인분당", color: "#F5A200" }],
    areaHint: "분당 서현 로데오거리 · AK플라자",
    aliases: ["서현", "서현역", "분당", "서현로데오"],
    kind: "station",
  },
  {
    id: "ilsan-jeongbalsan",
    name: "정발산역 (일산)",
    lines: [{ label: "3호선", color: "#EF7C1C" }],
    areaHint: "일산 호수공원 · 라페스타 · 웨스턴돔",
    aliases: ["일산", "라페스타", "웨스턴돔", "호수공원", "정발산", "고양시"],
    kind: "station",
  },
  {
    id: "beomgye",
    name: "범계역 (평촌)",
    lines: [{ label: "4호선", color: "#00A5DE" }],
    areaHint: "안양 평촌 범계 로데오거리",
    aliases: ["범계", "평촌", "범계로데오", "호계동", "안양"],
    kind: "station",
  },
  {
    id: "bucheon",
    name: "부천역",
    lines: [{ label: "1호선", color: "#0052A4" }],
    areaHint: "부천 로데오거리 · 피노키오 광장",
    aliases: ["부천", "부천역", "심곡동", "부천로데오"],
    kind: "station",
  },
  {
    id: "gangneung",
    name: "강릉 (안목해변)",
    lines: [{ label: "동해바다", color: "#0090D2" }],
    areaHint: "안목해변 커피거리 · 월화거리 · 중앙시장",
    aliases: ["강릉", "강릉역", "안목해변", "커피거리", "경포대", "월화거리"],
    kind: "area",
  },
  {
    id: "jeju-city",
    name: "제주 (제주시청·노형)",
    lines: [{ label: "제주도", color: "#F5A200" }],
    areaHint: "제주시청 대학로 맛집거리 · 노형 드림타워",
    aliases: ["제주", "제주시청", "노형동", "애월", "드림타워", "연동"],
    kind: "area",
  },
];

export const POPULAR_DEFAULT_STATIONS: SubwayStationHint[] = [
  SUBWAY_HINT_STATIONS[0], // 성수역
  SUBWAY_HINT_STATIONS[4], // 홍대입구역
  SUBWAY_HINT_STATIONS[12], // 강남역
  SUBWAY_HINT_STATIONS[15], // 혜화역
  SUBWAY_HINT_STATIONS[20], // 인천터미널역 (구월동)
  SUBWAY_HINT_STATIONS[27], // 서면역 (전포)
  SUBWAY_HINT_STATIONS[32], // 반월당역 (동성로)
  SUBWAY_HINT_STATIONS[35], // 중앙로역 (성심당)
];

export function searchSubwayStations(query: string, limit = 8): SubwayStationHint[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return POPULAR_DEFAULT_STATIONS.slice(0, limit);
  }

  // Remove "역" or "동" suffix for lenient matching (e.g. "구월" -> "구월동")
  const strippedStation = q.endsWith("역") ? q.slice(0, -1) : q;
  const strippedDong = q.endsWith("동") ? q.slice(0, -1) : q;

  const results = SUBWAY_HINT_STATIONS.filter((st) => {
    const nameLower = st.name.toLowerCase();
    const nameMatch =
      nameLower.includes(q) ||
      nameLower.replace(/역$/, "").includes(strippedStation) ||
      nameLower.replace(/동$/, "").includes(strippedDong);

    const lineMatch = st.lines.some((l) => l.label.toLowerCase().includes(q));
    const areaMatch = st.areaHint.toLowerCase().includes(q);
    const aliasMatch = st.aliases.some(
      (a) =>
        a.toLowerCase().includes(q) ||
        a.toLowerCase().includes(strippedStation) ||
        a.toLowerCase().includes(strippedDong),
    );

    return nameMatch || lineMatch || areaMatch || aliasMatch;
  });

  return results.slice(0, limit);
}
