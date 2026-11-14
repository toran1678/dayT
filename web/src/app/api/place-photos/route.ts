import { cacheLife } from "next/cache";
import { readServerSecret } from "@/shared/server/root-env";

export interface PlacePhotoItem {
  url: string;
  thumbnailUrl: string;
  source: "KAKAO" | "CURATED" | "TOUR_API";
  caption?: string;
}

interface KakaoImageDocument {
  collection?: string;
  thumbnail_url?: string;
  image_url?: string;
  width?: number;
  height?: number;
  display_sitename?: string;
  doc_url?: string;
}

interface KakaoImageSearchResponse {
  documents?: KakaoImageDocument[];
}

const CATEGORY_CURATED_PHOTOS: Record<string, string[]> = {
  RESTAURANT: [
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
  ],
  CAFE: [
    "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=800&q=80",
  ],
  EXHIBITION: [
    "https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1536924940846-227afb31e2a5?auto=format&fit=crop&w=800&q=80",
  ],
  ACTIVITY: [
    "https://images.unsplash.com/photo-1528722828814-77b9b83aafb2?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80",
  ],
  PARK: [
    "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
  ],
  FOOD_일식: [
    "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80",
  ],
  FOOD_양식: [
    "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80",
  ],
  FOOD_한식: [
    "https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=800&q=80",
  ],
  FOOD_고기: [
    "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80",
  ],
};

async function fetchKakaoPlacePhotos(
  apiKey: string,
  query: string,
  size = 5,
): Promise<PlacePhotoItem[]> {
  try {
    const params = new URLSearchParams({
      query,
      sort: "accuracy",
      page: "1",
      size: String(size),
    });

    const res = await fetch(
      `https://dapi.kakao.com/v2/search/image?${params.toString()}`,
      {
        headers: {
          Authorization: `KakaoAK ${apiKey}`,
        },
        signal: AbortSignal.timeout(3500),
      },
    );

    if (!res.ok) {
      return [];
    }

    const data = (await res.json()) as KakaoImageSearchResponse;
    const docs = Array.isArray(data.documents) ? data.documents : [];

    return docs
      .filter((doc) => doc.image_url && doc.image_url.startsWith("http"))
      .map((doc) => ({
        url: doc.image_url!,
        thumbnailUrl: doc.thumbnail_url || doc.image_url!,
        source: "KAKAO" as const,
        caption: doc.display_sitename,
      }));
  } catch {
    return [];
  }
}

async function getCachedPlacePhotos(
  placeName: string,
  address: string,
  categoryGroup: string,
  foodCategory?: string,
): Promise<PlacePhotoItem[]> {
  "use cache";
  cacheLife("hours");

  const apiKey = readServerSecret(
    "KAKAO_REST_API_KEY",
    "KAKAO_CLIENT_ID",
    "NEXT_PUBLIC_KAKAO_CLIENT_ID",
  );

  let kakaoPhotos: PlacePhotoItem[] = [];

  if (apiKey) {
    // 1차 검색: 장소명 + 동네/지역
    const addressTokens = address.split(" ").filter(Boolean);
    const district = addressTokens.length >= 2 ? addressTokens[1] : "";
    const primaryQuery = district
      ? `${district} ${placeName}`
      : `${placeName} 맛집`;

    kakaoPhotos = await fetchKakaoPlacePhotos(apiKey, primaryQuery, 5);

    // 검색 결과가 2장 미만이면 장소명 단독 검색으로 보강
    if (kakaoPhotos.length < 2) {
      const fallbackQuery = `${placeName}`;
      const more = await fetchKakaoPlacePhotos(apiKey, fallbackQuery, 4);
      for (const m of more) {
        if (!kakaoPhotos.some((p) => p.url === m.url)) {
          kakaoPhotos.push(m);
        }
      }
    }
  }

  // 카테고리/음식 전용 큐레이션 이미지 준비
  const curatedKey = foodCategory
    ? `FOOD_${foodCategory}`
    : categoryGroup || "RESTAURANT";
  const curatedList =
    CATEGORY_CURATED_PHOTOS[curatedKey] ?? CATEGORY_CURATED_PHOTOS.RESTAURANT;

  const curatedPhotos: PlacePhotoItem[] = curatedList.map((url) => ({
    url,
    thumbnailUrl: url,
    source: "CURATED" as const,
    caption: foodCategory ? `${foodCategory} 추천` : placeName,
  }));

  if (kakaoPhotos.length >= 3) {
    return kakaoPhotos.slice(0, 6);
  }

  // 카카오 사진이 1~2장이면 큐레이션 사진과 결합
  const combined = [...kakaoPhotos];
  for (const c of curatedPhotos) {
    if (combined.length >= 4) break;
    if (!combined.some((p) => p.url === c.url)) {
      combined.push(c);
    }
  }

  return combined;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name")?.trim();
  const address = searchParams.get("address")?.trim() || "";
  const category = searchParams.get("category")?.trim() || "RESTAURANT";
  const foodCategory = searchParams.get("foodCategory")?.trim() || undefined;

  if (!name) {
    return Response.json({ photos: [] }, { status: 400 });
  }

  try {
    const photos = await getCachedPlacePhotos(
      name,
      address,
      category,
      foodCategory,
    );
    return Response.json({ photos });
  } catch {
    const curatedKey = foodCategory
      ? `FOOD_${foodCategory}`
      : category || "RESTAURANT";
    const curated = (
      CATEGORY_CURATED_PHOTOS[curatedKey] ?? CATEGORY_CURATED_PHOTOS.RESTAURANT
    ).map((url) => ({
      url,
      thumbnailUrl: url,
      source: "CURATED" as const,
    }));
    return Response.json({ photos: curated });
  }
}

