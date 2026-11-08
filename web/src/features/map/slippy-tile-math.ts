export const TILE_SIZE = 256;
export const MIN_MAP_ZOOM = 11;
export const MAX_MAP_ZOOM = 18;
export const DEFAULT_MAP_CENTER = { lat: 37.54458, lng: 127.05597 };

const MAX_MERCATOR_LAT = 85.05112878;

export interface TileDescriptor {
  key: string;
  url: string;
  left: number;
  top: number;
}

export interface MapViewportState {
  centerLat: number;
  centerLng: number;
  zoom: number;
}

export function clampZoom(zoom: number): number {
  return Math.min(MAX_MAP_ZOOM, Math.max(MIN_MAP_ZOOM, Math.round(zoom)));
}

function clampLatitude(lat: number): number {
  return Math.min(MAX_MERCATOR_LAT, Math.max(-MAX_MERCATOR_LAT, lat));
}

export function latLngToWorldPx(
  lat: number,
  lng: number,
  zoom: number,
): { x: number; y: number } {
  const safeLat = clampLatitude(lat);
  const scale = TILE_SIZE * Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * scale;
  const sinLat = Math.sin((safeLat * Math.PI) / 180);
  const y =
    (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { x, y };
}

export function worldPxToLatLng(
  x: number,
  y: number,
  zoom: number,
): { lat: number; lng: number } {
  const scale = TILE_SIZE * Math.pow(2, zoom);
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return {
    lat: clampLatitude(lat),
    lng: ((((lng + 180) % 360) + 360) % 360) - 180,
  };
}

export function latLngToContainerPx(
  lat: number,
  lng: number,
  viewport: MapViewportState,
  width: number,
  height: number,
): { x: number; y: number } {
  const centerWorld = latLngToWorldPx(
    viewport.centerLat,
    viewport.centerLng,
    viewport.zoom,
  );
  const pointWorld = latLngToWorldPx(lat, lng, viewport.zoom);
  return {
    x: Math.round(width / 2 + (pointWorld.x - centerWorld.x)),
    y: Math.round(height / 2 + (pointWorld.y - centerWorld.y)),
  };
}

export function containerPxToLatLng(
  containerX: number,
  containerY: number,
  viewport: MapViewportState,
  width: number,
  height: number,
): { lat: number; lng: number } {
  const centerWorld = latLngToWorldPx(
    viewport.centerLat,
    viewport.centerLng,
    viewport.zoom,
  );
  const clickWorldX = centerWorld.x + (containerX - width / 2);
  const clickWorldY = centerWorld.y + (containerY - height / 2);
  return worldPxToLatLng(clickWorldX, clickWorldY, viewport.zoom);
}

export function panViewportByPixels(
  viewport: MapViewportState,
  deltaX: number,
  deltaY: number,
): MapViewportState {
  const centerWorld = latLngToWorldPx(
    viewport.centerLat,
    viewport.centerLng,
    viewport.zoom,
  );
  const next = worldPxToLatLng(
    centerWorld.x - deltaX,
    centerWorld.y - deltaY,
    viewport.zoom,
  );
  return {
    centerLat: next.lat,
    centerLng: next.lng,
    zoom: viewport.zoom,
  };
}

export function computeBestFitViewport(
  points: { latitude: number; longitude: number }[],
  width: number,
  height: number,
  padding: { top: number; right: number; bottom: number; left: number } = {
    top: 64,
    right: 52,
    bottom: 92,
    left: 52,
  },
): MapViewportState {
  if (points.length === 0) {
    return {
      centerLat: DEFAULT_MAP_CENTER.lat,
      centerLng: DEFAULT_MAP_CENTER.lng,
      zoom: 15,
    };
  }

  if (points.length === 1) {
    return {
      centerLat: points[0].latitude,
      centerLng: points[0].longitude,
      zoom: 16,
    };
  }

  const safeW = Math.max(width, 320);
  const safeH = Math.max(height, 260);
  const usableW = Math.max(safeW - padding.left - padding.right, 120);
  const usableH = Math.max(safeH - padding.top - padding.bottom, 100);

  let chosenZoom = MIN_MAP_ZOOM;
  for (let z = 17; z >= MIN_MAP_ZOOM; z--) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const pt of points) {
      const w = latLngToWorldPx(pt.latitude, pt.longitude, z);
      if (w.x < minX) minX = w.x;
      if (w.x > maxX) maxX = w.x;
      if (w.y < minY) minY = w.y;
      if (w.y > maxY) maxY = w.y;
    }

    if (maxX - minX <= usableW && maxY - minY <= usableH) {
      chosenZoom = z;
      break;
    }
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const pt of points) {
    const w = latLngToWorldPx(pt.latitude, pt.longitude, chosenZoom);
    if (w.x < minX) minX = w.x;
    if (w.x > maxX) maxX = w.x;
    if (w.y < minY) minY = w.y;
    if (w.y > maxY) maxY = w.y;
  }

  // Offset center slightly upward when bottom padding is taller than top padding
  const offsetX = (padding.left - padding.right) / 2;
  const offsetY = (padding.top - padding.bottom) / 2;
  const center = worldPxToLatLng(
    (minX + maxX) / 2 - offsetX,
    (minY + maxY) / 2 - offsetY,
    chosenZoom,
  );

  return {
    centerLat: center.lat,
    centerLng: center.lng,
    zoom: chosenZoom,
  };
}

export function getVisibleOsmTiles(
  viewport: MapViewportState,
  width: number,
  height: number,
): TileDescriptor[] {
  const z = clampZoom(viewport.zoom);
  const safeW = Math.max(width, 320);
  const safeH = Math.max(height, 260);
  const centerWorld = latLngToWorldPx(viewport.centerLat, viewport.centerLng, z);

  const topLeftX = centerWorld.x - safeW / 2;
  const topLeftY = centerWorld.y - safeH / 2;

  const startTileX = Math.floor(topLeftX / TILE_SIZE) - 1;
  const endTileX = Math.floor((topLeftX + safeW) / TILE_SIZE) + 1;
  const startTileY = Math.floor(topLeftY / TILE_SIZE) - 1;
  const endTileY = Math.floor((topLeftY + safeH) / TILE_SIZE) + 1;

  const maxTileIndex = Math.pow(2, z);
  const tiles: TileDescriptor[] = [];

  for (let ty = startTileY; ty <= endTileY; ty++) {
    if (ty < 0 || ty >= maxTileIndex) continue;
    for (let tx = startTileX; tx <= endTileX; tx++) {
      const wrappedX = ((tx % maxTileIndex) + maxTileIndex) % maxTileIndex;
      // Next.js 전용 타일 프록시: OSM 사용 정책(User-Agent) 준수 & 워터마크 원천 차단
      tiles.push({
        key: `${z}-${wrappedX}-${ty}-${tx}`,
        url: `/api/map/tiles/${z}/${wrappedX}/${ty}.png`,
        left: Math.round(tx * TILE_SIZE - topLeftX),
        top: Math.round(ty * TILE_SIZE - topLeftY),
      });
    }
  }

  return tiles;
}

const SCALE_STEPS_METERS = [30, 50, 100, 200, 300, 500, 1000, 2000, 3000, 5000];

export function computeMetricScaleBar(
  latitude: number,
  zoom: number,
): { label: string; widthPx: number } {
  const metersPerPx =
    (156543.03392 * Math.cos((clampLatitude(latitude) * Math.PI) / 180)) /
    Math.pow(2, clampZoom(zoom));

  let chosenMeters = 200;
  for (const step of SCALE_STEPS_METERS) {
    const px = step / metersPerPx;
    chosenMeters = step;
    if (px >= 54) {
      break;
    }
  }

  const widthPx = Math.min(116, Math.max(42, Math.round(chosenMeters / metersPerPx)));
  const label =
    chosenMeters >= 1000 ? `${chosenMeters / 1000}km` : `${chosenMeters}m`;
  return { label, widthPx };
}

