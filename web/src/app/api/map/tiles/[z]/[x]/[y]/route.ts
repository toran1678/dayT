import { readServerSecret } from "@/shared/server/root-env";

export async function GET(
  _request: Request,
  context: { params: Promise<{ z: string; x: string; y: string }> },
) {
  const { z, x, y } = await context.params;
  const cleanY = y.replace(/\.png$/, "");

  const cartoApiKey = readServerSecret(
    "CARTO_API_KEY",
    "NEXT_PUBLIC_CARTO_API_KEY",
  );

  const headers: Record<string, string> = {
    "User-Agent": "DayT-App/1.0 (contact: dayt-app@local; web-map-renderer)",
    Accept: "image/png,image/webp,image/*",
  };

  let tileUrl: string;
  if (cartoApiKey) {
    const sub = ["a", "b", "c", "d"][Math.abs(Number(x) + Number(cleanY)) % 4];
    tileUrl = `https://${sub}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${cleanY}.png?api_key=${encodeURIComponent(cartoApiKey)}`;
  } else {
    // OpenStreetMap 공식 사용 정책(식별 가능한 User-Agent 명시)을 준수하는 서버 프록시
    tileUrl = `https://tile.openstreetmap.org/${z}/${x}/${cleanY}.png`;
  }

  try {
    const res = await fetch(tileUrl, {
      headers,
      next: { revalidate: 86400 * 7 }, // 7일 캐싱
    });

    if (!res.ok) {
      // 1차 실패 시 Carto Voyager 폴백
      const fallbackUrl = `https://basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${cleanY}.png`;
      const fallbackRes = await fetch(fallbackUrl, { headers });
      if (fallbackRes.ok) {
        const blob = await fallbackRes.arrayBuffer();
        return new Response(blob, {
          status: 200,
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=604800, immutable",
          },
        });
      }
      return new Response(null, { status: res.status });
    }

    const imageBytes = await res.arrayBuffer();
    return new Response(imageBytes, {
      status: 200,
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "image/png",
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}

