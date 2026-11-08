"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Check, Crosshair, MapPin, Minus, Plus, X } from "lucide-react";
import {
  clampZoom,
  containerPxToLatLng,
  DEFAULT_MAP_CENTER,
  getVisibleOsmTiles,
  latLngToContainerPx,
  latLngToWorldPx,
  panViewportByPixels,
  type MapViewportState,
} from "@/features/map/slippy-tile-math";

interface LocationPinPickerModalProps {
  initialLat?: number | null;
  initialLng?: number | null;
  initialKeyword?: string;
  radiusKm: number;
  onSelectLocation: (lat: number, lng: number, placeName: string) => void;
  onClose: () => void;
}

export function LocationPinPickerModal({
  initialLat,
  initialLng,
  initialKeyword,
  radiusKm,
  onSelectLocation,
  onClose,
}: LocationPinPickerModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 600, height: 420 });

  const initialCenterLat = initialLat ?? DEFAULT_MAP_CENTER.lat;
  const initialCenterLng = initialLng ?? DEFAULT_MAP_CENTER.lng;

  const [viewport, setViewport] = useState<MapViewportState>({
    centerLat: initialCenterLat,
    centerLng: initialCenterLng,
    zoom: 14,
  });

  const [pinnedCoord, setPinnedCoord] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : { lat: initialCenterLat, lng: initialCenterLng },
  );

  const [isDragging, setIsDragging] = useState(false);
  const [hasMovedFar, setHasMovedFar] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  // ResizeObserver for dynamic container dimension
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          setContainerSize({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
    setHasMovedFar(false);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      setHasMovedFar(true);
    }
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setViewport((prev) => panViewportByPixels(prev, dx, dy));
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    // If pointer was simply clicked without dragging, place pin at click coordinates
    if (!hasMovedFar && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const geo = containerPxToLatLng(clickX, clickY, viewport, containerSize.width, containerSize.height);
      setPinnedCoord(geo);
    }
  };

  const handleZoom = useCallback((delta: number) => {
    setViewport((prev) => ({
      ...prev,
      zoom: clampZoom(prev.zoom + delta),
    }));
  }, []);

  const handleResetToCurrentCenter = () => {
    setPinnedCoord({
      lat: viewport.centerLat,
      lng: viewport.centerLng,
    });
  };

  const handleConfirm = () => {
    if (!pinnedCoord) return;
    const label = initialKeyword && initialKeyword.trim().length > 0
      ? `${initialKeyword.trim()} 핀 지정`
      : `지도 지정 좌표 (${pinnedCoord.lat.toFixed(4)}, ${pinnedCoord.lng.toFixed(4)})`;
    onSelectLocation(pinnedCoord.lat, pinnedCoord.lng, label);
    onClose();
  };

  // Compute map tiles
  const tiles = getVisibleOsmTiles(viewport, containerSize.width, containerSize.height);

  // Pin marker container position
  const pinPx = pinnedCoord
    ? latLngToContainerPx(pinnedCoord.lat, pinnedCoord.lng, viewport, containerSize.width, containerSize.height)
    : null;

  // Compute radius in container pixels for circular overlay
  const radiusPx = pinnedCoord
    ? (() => {
        // Offset longitude by (radiusKm * 1000) meters
        const earthRadiusMeters = 6_371_000;
        const radLat = (pinnedCoord.lat * Math.PI) / 180;
        const deltaLng = ((radiusKm * 1000) / (earthRadiusMeters * Math.cos(radLat))) * (180 / Math.PI);
        const centerWorld = latLngToWorldPx(pinnedCoord.lat, pinnedCoord.lng, viewport.zoom);
        const edgeWorld = latLngToWorldPx(pinnedCoord.lat, pinnedCoord.lng + deltaLng, viewport.zoom);
        return Math.max(10, Math.round(Math.abs(edgeWorld.x - centerWorld.x)));
      })()
    : 0;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white">
              <MapPin className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-black text-foreground">
                지도에서 탐색 중심 핀 꽂기
              </h3>
              <p className="text-[11px] font-bold text-muted">
                원하는 지점을 클릭하면 해당 위치와 탐색 반경({radiusKm}km) 기준으로 AI 코스가 설계됩니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-full p-1.5 text-muted hover:bg-surface-subtle hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Map Canvas */}
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="relative h-[380px] w-full cursor-crosshair select-none overflow-hidden bg-[#e8e4de]"
        >
          {/* Tiles */}
          <div className="pointer-events-none absolute inset-0">
            {tiles.map((tile) => (
              <img
                key={tile.key}
                src={tile.url}
                alt=""
                loading="eager"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.dataset.fallback) {
                    target.dataset.fallback = "true";
                    target.src = tile.url.replace("voyager", "light_all");
                  }
                }}
                className="absolute block select-none"
                style={{
                  left: tile.left,
                  top: tile.top,
                  width: 256,
                  height: 256,
                }}
              />
            ))}
          </div>

          {/* Radius Circular Overlay around Pinned Point */}
          {pinPx && radiusPx > 0 && (
            <svg className="pointer-events-none absolute inset-0 h-full w-full">
              <circle
                cx={pinPx.x}
                cy={pinPx.y}
                r={radiusPx}
                fill="rgba(240, 84, 84, 0.12)"
                stroke="#f05454"
                strokeWidth="2"
                strokeDasharray="4 3"
              />
            </svg>
          )}

          {/* Marker Pin */}
          {pinPx && (
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-full transition-transform duration-75"
              style={{ left: pinPx.x, top: pinPx.y }}
            >
              <div className="flex flex-col items-center">
                <span className="rounded-full bg-surface-dark px-2 py-0.5 text-[10px] font-black text-white shadow-md">
                  탐색 중심
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white shadow-lg ring-2 ring-white">
                  <MapPin className="h-4 w-4" />
                </span>
                <span className="h-2 w-0.5 bg-primary" />
              </div>
            </div>
          )}

          {/* Map Controls Floating on Top */}
          <div className="absolute right-3 top-3 flex flex-col gap-1.5 shadow-md">
            <button
              type="button"
              onClick={() => handleZoom(1)}
              aria-label="확대"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface/90 text-foreground backdrop-blur-xs hover:bg-surface"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleZoom(-1)}
              aria-label="축소"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface/90 text-foreground backdrop-blur-xs hover:bg-surface"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleResetToCurrentCenter}
              title="지도 현재 중심에 핀 꽂기"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface/90 text-foreground backdrop-blur-xs hover:bg-surface"
            >
              <Crosshair className="h-4 w-4 text-primary" />
            </button>
          </div>

          {/* Bottom Left Radius Badge */}
          <div className="absolute bottom-3 left-3 rounded-full bg-surface-dark/85 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-xs">
            반경 {radiusKm}km 원형 커버
          </div>
        </div>

        {/* Footer & Confirm */}
        <div className="flex items-center justify-between border-t border-line bg-surface p-4">
          <div className="min-w-0 flex-1 pr-3">
            {pinnedCoord ? (
              <p className="truncate text-xs font-bold text-foreground">
                📍 선택 좌표:{" "}
                <span className="text-primary">
                  {pinnedCoord.lat.toFixed(5)}, {pinnedCoord.lng.toFixed(5)}
                </span>
              </p>
            ) : (
              <p className="text-xs font-bold text-muted">지도를 클릭하여 핀을 꽂아주세요.</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-line px-3.5 py-2 text-xs font-bold text-muted hover:bg-surface-subtle hover:text-foreground"
            >
              취소
            </button>
            <button
              type="button"
              disabled={!pinnedCoord}
              onClick={handleConfirm}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-black text-white hover:bg-primary-hover disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              <span>이 위치로 중심 핀 설정</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

