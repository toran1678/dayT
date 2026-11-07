import fs from "node:fs";
import path from "node:path";
import { cacheLife } from "next/cache";
import {
  buildFallbackMapContext,
  resolveSubwayLineBadge,
  splitKakaoStationName,
  type MapSurroundingContext,
  type SubwayStationPoi,
  type SurroundingPoi,
  type SurroundingPoiKind,
} from "@/features/map/map-context";

interface KakaoCategoryDocument {
  id?: string;
  place_name?: string;
  category_name?: string;
  place_url?: string;
  x?: string;
  y?: string;
  distance?: string;
}

interface KakaoCategoryResponse {
  documents?: KakaoCategoryDocument[];
}

function readServerKakaoRestApiKey(): string | null {
  const candidates = [
    process.env.KAKAO_REST_API_KEY,
    process.env.KAKAO_CLIENT_ID,
    process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID,
  ];

  for (const val of candidates) {
    const trimmed = val?.trim();
    if (trimmed && !trimmed.startsWith("your_") && trimmed !== "CHANGE_ME") {
      return trimmed;
    }
  }

  try {
    const rootEnvCandidates = [
      path.resolve(process.cwd(), "..", ".env"),
      path.resolve(process.cwd(), ".env"),
    ];
    for (const envPath of rootEnvCandidates) {
      if (!fs.existsSync(envPath)) continue;
      const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const eqIdx = line.indexOf("=");
        if (eqIdx <= 0) continue;
        const k = line.slice(0, eqIdx).trim();
        const v = line
          .slice(eqIdx + 1)
          .trim()
          .replace(/^['"]|['"]$/g, "");
        if (
          (k === "KAKAO_REST_API_KEY" || k === "KAKAO_CLIENT_ID") &&
          v &&
          !v.startsWith("your_")
        ) {
          return v;
        }
      }
    }
  } catch {
    // Ignore fs errors in restricted runtimes
  }

  return null;
}

async function queryKakaoCategory(
  apiKey: string,
  categoryGroupCode: string,
  lat: number,
  lng: number,
  radiusMeters: number,
  size: number,
): Promise<KakaoCategoryDocument[]> {
  const params = new URLSearchParams({
    category_group_code: categoryGroupCode,
    x: String(lng),
    y: String(lat),
    radius: String(Math.min(Math.max(radiusMeters, 500), 20000)),
    sort: "distance",
    size: String(size),
  });

  const res = await fetch(
    `https://dapi.kakao.com/v2/local/search/category.json?${params.toString()}`,
    {
      headers: {
        Authorization: `KakaoAK ${apiKey}`,
      },
      signal: AbortSignal.timeout(3500),
    },
  );

  if (!res.ok) {
    throw new Error(`Kakao category HTTP ${res.status}`);
  }

  const body = (await res.json()) as KakaoCategoryResponse;
  return Array.isArray(body.documents) ? body.documents : [];
}

async function queryKakaoKeyword(
  apiKey: string,
  keyword: string,
  lat: number,
  lng: number,
  radiusMeters: number,
  size: number,
): Promise<KakaoCategoryDocument[]> {
  const params = new URLSearchParams({
    query: keyword,
    x: String(lng),
    y: String(lat),
    radius: String(Math.min(Math.max(radiusMeters, 500), 20000)),
    sort: "distance",
    size: String(size),
  });

  const res = await fetch(
    `https://dapi.kakao.com/v2/local/search/keyword.json?${params.toString()}`,
    {
      headers: {
        Authorization: `KakaoAK ${apiKey}`,
      },
      signal: AbortSignal.timeout(3500),
    },
  );

  if (!res.ok) {
    throw new Error(`Kakao keyword HTTP ${res.status}`);
  }

  const body = (await res.json()) as KakaoCategoryResponse;
  return Array.isArray(body.documents) ? body.documents : [];
}

function mergeKakaoStations(docs: KakaoCategoryDocument[]): SubwayStationPoi[] {
  const byStationName = new Map<string, SubwayStationPoi>();

  for (const doc of docs) {
    const rawName = doc.place_name?.trim();
    const lat = Number(doc.y);
    const lng = Number(doc.x);
    if (!rawName || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      continue;
    }

    const { stationName, lineHint } = splitKakaoStationName(rawName);
    const badge = resolveSubwayLineBadge(lineHint, doc.category_name ?? "");
    const distanceMeters = Math.max(0, Math.round(Number(doc.distance) || 0));

    const existing = byStationName.get(stationName);
    if (existing) {
      if (!existing.lines.some((l) => l.label === badge.label)) {
        existing.lines.push(badge);
      }
      if (distanceMeters < existing.distanceMeters) {
        existing.distanceMeters = distanceMeters;
      }
    } else {
      byStationName.set(stationName, {
        id: doc.id ?? `st-${stationName}`,
        name: stationName,
        latitude: lat,
        longitude: lng,
        distanceMeters,
        lines: [badge],
        placeUrl: doc.place_url?.trim() || null,
      });
    }
  }

  return Array.from(byStationName.values())
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, 10);
}

function parseSurroundingPois(
  docs: KakaoCategoryDocument[],
  kind: SurroundingPoiKind,
  fallbackCategoryLabel: string,
): SurroundingPoi[] {
  const result: SurroundingPoi[] = [];
  const seenNames = new Set<string>();

  for (const doc of docs) {
    const name = doc.place_name?.trim();
    const lat = Number(doc.y);
    const lng = Number(doc.x);
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (seenNames.has(name)) continue;
    if (kind === "PARK" && name.includes("주차장")) continue;
    seenNames.add(name);

    const catTokens = (doc.category_name ?? "")
      .split(">")
      .map((s) => s.trim())
      .filter(Boolean);
    const categoryLabel =
      catTokens[catTokens.length - 1] ?? fallbackCategoryLabel;

    const resolvedKind: SurroundingPoiKind =
      kind === "LANDMARK" &&
      (categoryLabel.includes("공원") ||
        categoryLabel.includes("숲") ||
        name.includes("공원") ||
        name.includes("숲길"))
        ? "PARK"
        : kind;

    result.push({
      id: doc.id ?? `${resolvedKind}-${name}`,
      name,
      kind: resolvedKind,
      categoryLabel,
      latitude: lat,
      longitude: lng,
      distanceMeters: Math.max(0, Math.round(Number(doc.distance) || 0)),
      placeUrl: doc.place_url?.trim() || null,
    });
  }

  return result;
}

async function fetchCachedMapContext(
  roundedLat: number,
  roundedLng: number,
  radiusMeters: number,
): Promise<MapSurroundingContext> {
  "use cache";
  cacheLife("hours");

  const kakaoKey = readServerKakaoRestApiKey();
  if (!kakaoKey) {
    return buildFallbackMapContext(roundedLat, roundedLng, radiusMeters);
  }

  const stationRadius = Math.min(Math.max(radiusMeters + 600, 2400), 6000);
  const poiRadius = Math.min(Math.max(radiusMeters, 1500), 4500);

  try {
    const [swRes, parkRes, atRes, ctRes, pkRes] = await Promise.allSettled([
      queryKakaoCategory(kakaoKey, "SW8", roundedLat, roundedLng, stationRadius, 15),
      queryKakaoKeyword(kakaoKey, "공원", roundedLat, roundedLng, poiRadius, 6),
      queryKakaoCategory(kakaoKey, "AT4", roundedLat, roundedLng, poiRadius, 6),
      queryKakaoCategory(kakaoKey, "CT1", roundedLat, roundedLng, poiRadius, 6),
      queryKakaoCategory(kakaoKey, "PK6", roundedLat, roundedLng, Math.min(poiRadius, 2200), 10),
    ]);

    const swDocs = swRes.status === "fulfilled" ? swRes.value : [];
    const parkDocs = parkRes.status === "fulfilled" ? parkRes.value : [];
    const atDocs = atRes.status === "fulfilled" ? atRes.value : [];
    const ctDocs = ctRes.status === "fulfilled" ? ctRes.value : [];
    const pkDocs = pkRes.status === "fulfilled" ? pkRes.value : [];

    if (
      swRes.status === "rejected" &&
      parkRes.status === "rejected" &&
      atRes.status === "rejected" &&
      ctRes.status === "rejected"
    ) {
      return buildFallbackMapContext(roundedLat, roundedLng, radiusMeters);
    }

    const stations = mergeKakaoStations(swDocs);
    const landmarks = [
      ...parseSurroundingPois(parkDocs, "PARK", "공원·산책"),
      ...parseSurroundingPois(atDocs, "LANDMARK", "명소·산책"),
      ...parseSurroundingPois(ctDocs, "CULTURE", "문화·전시"),
    ]
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .filter(
        (item, idx, arr) => arr.findIndex((o) => o.name === item.name) === idx,
      )
      .slice(0, 10);

    const allParkings = parseSurroundingPois(pkDocs, "PARKING", "주차장");
    const prioritizedParkings = [
      ...allParkings.filter((p) => p.name.includes("공영")),
      ...allParkings.filter((p) => !p.name.includes("공영")),
    ].slice(0, 6);

    return {
      stations,
      landmarks,
      parkings: prioritizedParkings,
      source: "KAKAO",
    };
  } catch {
    return buildFallbackMapContext(roundedLat, roundedLng, radiusMeters);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawLat = Number(searchParams.get("lat"));
  const rawLng = Number(searchParams.get("lng"));
  const rawRadius = Number(searchParams.get("radius") ?? "2000");

  if (
    !Number.isFinite(rawLat) ||
    !Number.isFinite(rawLng) ||
    rawLat < -85 ||
    rawLat > 85 ||
    rawLng < -180 ||
    rawLng > 180
  ) {
    return Response.json(
      { stations: [], landmarks: [], parkings: [], source: "FALLBACK" },
      { status: 400 },
    );
  }

  const roundedLat = Math.round(rawLat * 1000) / 1000;
  const roundedLng = Math.round(rawLng * 1000) / 1000;
  const safeRadius = Number.isFinite(rawRadius)
    ? Math.min(Math.max(Math.round(rawRadius), 600), 10000)
    : 2000;

  const context = await fetchCachedMapContext(roundedLat, roundedLng, safeRadius);
  return Response.json(context);
}
