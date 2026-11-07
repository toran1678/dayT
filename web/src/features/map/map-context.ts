import { calculateStraightMeters } from "./geo-utils";

export interface SubwayLineBadge {
  label: string;
  color: string;
}

export interface SubwayStationPoi {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  lines: SubwayLineBadge[];
  placeUrl: string | null;
}

export type SurroundingPoiKind = "PARK" | "LANDMARK" | "CULTURE" | "PARKING";

export interface SurroundingPoi {
  id: string;
  name: string;
  kind: SurroundingPoiKind;
  categoryLabel: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  placeUrl: string | null;
}

export interface MapSurroundingContext {
  stations: SubwayStationPoi[];
  landmarks: SurroundingPoi[];
  parkings: SurroundingPoi[];
  source: "KAKAO" | "FALLBACK";
}

const SUBWAY_LINE_COLOR_RULES: { match: RegExp; label: string; color: string }[] = [
  { match: /신분당/, label: "신분당", color: "#D4003B" },
  { match: /수인분당|분당선/, label: "수인분당", color: "#F5A200" },
  { match: /경의중앙|경의선|중앙선/, label: "경의중앙", color: "#77C4A3" },
  { match: /공항철도|공항선/, label: "공항철도", color: "#0090D2" },
  { match: /경춘/, label: "경춘", color: "#0C8E72" },
  { match: /우이신설/, label: "우이신설", color: "#B0CE18" },
  { match: /신림/, label: "신림", color: "#6789CA" },
  { match: /김포골드/, label: "김포골드", color: "#AD8605" },
  { match: /서해/, label: "서해", color: "#8FC31F" },
  { match: /경강/, label: "경강", color: "#003DA5" },
  { match: /GTX-?A/i, label: "GTX-A", color: "#9A6292" },
  { match: /인천1/, label: "인천1", color: "#7CA8D5" },
  { match: /인천2/, label: "인천2", color: "#ED8B00" },
  { match: /부산1/, label: "부산1", color: "#F06A00" },
  { match: /부산2/, label: "부산2", color: "#81BF48" },
  { match: /부산3/, label: "부산3", color: "#BB8C00" },
  { match: /부산4/, label: "부산4", color: "#217DCB" },
  { match: /동해/, label: "동해", color: "#0054A6" },
  { match: /대구1/, label: "대구1", color: "#D93F5C" },
  { match: /대구2/, label: "대구2", color: "#00AA80" },
  { match: /대구3/, label: "대구3", color: "#FFB100" },
  { match: /대전1/, label: "대전1", color: "#007448" },
  { match: /광주1/, label: "광주1", color: "#009088" },
  { match: /(?:수도권)?1호선|^1호선$/, label: "1호선", color: "#0052A4" },
  { match: /(?:수도권)?2호선|^2호선$/, label: "2호선", color: "#00A84D" },
  { match: /(?:수도권)?3호선|^3호선$/, label: "3호선", color: "#EF7C1C" },
  { match: /(?:수도권)?4호선|^4호선$/, label: "4호선", color: "#00A4E3" },
  { match: /(?:수도권)?5호선|^5호선$/, label: "5호선", color: "#996CAC" },
  { match: /(?:수도권)?6호선|^6호선$/, label: "6호선", color: "#CD7C2F" },
  { match: /(?:수도권)?7호선|^7호선$/, label: "7호선", color: "#747F00" },
  { match: /(?:수도권)?8호선|^8호선$/, label: "8호선", color: "#E6186C" },
  { match: /(?:수도권)?9호선|^9호선$/, label: "9호선", color: "#BDB092" },
];

export function resolveSubwayLineBadge(
  rawLineText: string,
  categoryName = "",
): SubwayLineBadge {
  const combined = `${rawLineText} ${categoryName}`.trim();
  for (const rule of SUBWAY_LINE_COLOR_RULES) {
    if (rule.match.test(combined)) {
      return { label: rule.label, color: rule.color };
    }
  }
  const cleaned = rawLineText.replace(/선$/, "").trim();
  return {
    label: cleaned || "전철",
    color: "#475569",
  };
}

export function splitKakaoStationName(placeName: string): {
  stationName: string;
  lineHint: string;
} {
  const trimmed = placeName.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length <= 1) {
    return { stationName: trimmed, lineHint: "" };
  }
  return {
    stationName: parts[0],
    lineHint: parts.slice(1).join(" "),
  };
}

interface FallbackStationSeed {
  name: string;
  latitude: number;
  longitude: number;
  lines: string[];
}

interface FallbackLandmarkSeed {
  name: string;
  kind: SurroundingPoiKind;
  categoryLabel: string;
  latitude: number;
  longitude: number;
}

const FALLBACK_STATIONS: FallbackStationSeed[] = [
  { name: "홍대입구역", latitude: 37.557192, longitude: 126.925381, lines: ["2호선", "경의중앙", "공항철도"] },
  { name: "가좌역", latitude: 37.568491, longitude: 126.915024, lines: ["경의중앙"] },
  { name: "망원역", latitude: 37.556085, longitude: 126.910052, lines: ["6호선"] },
  { name: "합정역", latitude: 37.549463, longitude: 126.913739, lines: ["2호선", "6호선"] },
  { name: "상수역", latitude: 37.547716, longitude: 126.922852, lines: ["6호선"] },
  { name: "연신내역", latitude: 37.619001, longitude: 126.921008, lines: ["3호선", "6호선", "GTX-A"] },
  { name: "성수역", latitude: 37.544581, longitude: 127.055961, lines: ["2호선"] },
  { name: "뚝섬역", latitude: 37.547184, longitude: 127.047367, lines: ["2호선"] },
  { name: "서울숲역", latitude: 37.543617, longitude: 127.044717, lines: ["수인분당"] },
  { name: "건대입구역", latitude: 37.540408, longitude: 127.069231, lines: ["2호선", "7호선"] },
  { name: "한강진역", latitude: 37.539631, longitude: 127.001742, lines: ["6호선"] },
  { name: "이태원역", latitude: 37.534533, longitude: 126.994579, lines: ["6호선"] },
  { name: "녹사평역", latitude: 37.534675, longitude: 126.986695, lines: ["6호선"] },
  { name: "강남역", latitude: 37.497952, longitude: 127.027619, lines: ["2호선", "신분당"] },
  { name: "신논현역", latitude: 37.504598, longitude: 127.02506, lines: ["9호선", "신분당"] },
  { name: "역삼역", latitude: 37.500622, longitude: 127.036456, lines: ["2호선"] },
  { name: "혜화역", latitude: 37.582336, longitude: 127.001844, lines: ["4호선"] },
  { name: "안국역", latitude: 37.576477, longitude: 126.985443, lines: ["3호선"] },
  { name: "종로3가역", latitude: 37.571607, longitude: 126.991806, lines: ["1호선", "3호선", "5호선"] },
  { name: "잠실역", latitude: 37.513262, longitude: 127.100159, lines: ["2호선", "8호선"] },
  { name: "인천터미널역", latitude: 37.442262, longitude: 126.6997, lines: ["인천1"] },
  { name: "예술회관역", latitude: 37.449395, longitude: 126.700942, lines: ["인천1"] },
];

const FALLBACK_LANDMARKS: FallbackLandmarkSeed[] = [
  { name: "경의선숲길 (연트럴파크)", kind: "PARK", categoryLabel: "도시공원·산책로", latitude: 37.56185, longitude: 126.92342 },
  { name: "경의선책거리", kind: "CULTURE", categoryLabel: "문화거리", latitude: 37.55532, longitude: 126.92885 },
  { name: "연남동 공영주차장", kind: "PARKING", categoryLabel: "공영주차장", latitude: 37.56125, longitude: 126.92488 },
  { name: "서울숲", kind: "PARK", categoryLabel: "대형공원", latitude: 37.544388, longitude: 127.037442 },
  { name: "성수연방", kind: "CULTURE", categoryLabel: "복합문화공간", latitude: 37.54251, longitude: 127.05439 },
  { name: "성수2가1동 공영주차장", kind: "PARKING", categoryLabel: "공영주차장", latitude: 37.54341, longitude: 127.05689 },
  { name: "리움미술관", kind: "CULTURE", categoryLabel: "미술관", latitude: 37.538417, longitude: 126.999304 },
  { name: "마로니에공원", kind: "PARK", categoryLabel: "문화공원", latitude: 37.580278, longitude: 127.002875 },
  { name: "석촌호수", kind: "PARK", categoryLabel: "호수공원", latitude: 37.509088, longitude: 127.102778 },
];

export function buildFallbackMapContext(
  latitude: number,
  longitude: number,
  radiusMeters: number,
): MapSurroundingContext {
  const maxStationRadius = Math.max(radiusMeters, 2500);
  const stations: SubwayStationPoi[] = FALLBACK_STATIONS.map((seed, idx) => {
    const distanceMeters = Math.round(
      calculateStraightMeters(latitude, longitude, seed.latitude, seed.longitude),
    );
    return {
      id: `fb-st-${idx}`,
      name: seed.name,
      latitude: seed.latitude,
      longitude: seed.longitude,
      distanceMeters,
      lines: seed.lines.map((line) => resolveSubwayLineBadge(line)),
      placeUrl: null,
    };
  })
    .filter((st) => st.distanceMeters <= maxStationRadius)
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, 5);

  const nearbyPois = FALLBACK_LANDMARKS.map((seed, idx) => {
    const distanceMeters = Math.round(
      calculateStraightMeters(latitude, longitude, seed.latitude, seed.longitude),
    );
    return {
      id: `fb-poi-${idx}`,
      name: seed.name,
      kind: seed.kind,
      categoryLabel: seed.categoryLabel,
      latitude: seed.latitude,
      longitude: seed.longitude,
      distanceMeters,
      placeUrl: null,
    };
  })
    .filter((poi) => poi.distanceMeters <= maxStationRadius)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  return {
    stations,
    landmarks: nearbyPois.filter((p) => p.kind !== "PARKING").slice(0, 5),
    parkings: nearbyPois.filter((p) => p.kind === "PARKING").slice(0, 3),
    source: "FALLBACK",
  };
}

