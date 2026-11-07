"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ExternalLink, MapPin, Navigation } from "lucide-react";
import type { LatLngPoint } from "@/shared/api/types";
import { estimateWalkingRoute, formatDistanceKo } from "./geo-utils";
import {
  DAYT_WARM_MAP_STYLES,
  getConfiguredGoogleMapsApiKey,
  loadGoogleMapsApi,
  subscribeGoogleMapsAuthFailure,
  type GoogleInfoWindowInstance,
  type GoogleMapInstance,
  type GoogleMarkerInstance,
  type GooglePolylineInstance,
} from "./google-maps-loader";

export interface RouteMapStop {
  id: number;
  order: number;
  name: string;
  address: string;
  categoryLabel: string;
  latitude: number;
  longitude: number;
  stayMinutes?: number;
  estimatedCost?: number;
  memo?: string | null;
  placeUrl?: string | null;
}

interface CourseRouteMapProps {
  stops: RouteMapStop[];
  polyline?: LatLngPoint[];
  connectRoute?: boolean;
  activeOrder?: number | null;
  onSelectStop?: (stop: RouteMapStop) => void;
  headerTitle?: string;
  heightClassName?: string;
  footerNode?: ReactNode;
}

function buildNumberedMarkerSvgUrl(order: number, isActive: boolean): string {
  const fill = isActive ? "#1C1917" : "#E85D3F";
  const ring = isActive ? "#FBBF24" : "#FFFFFF";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 38 38">
    <circle cx="19" cy="19" r="16" fill="${fill}" stroke="${ring}" stroke-width="3"/>
    <text x="19" y="23.5" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="800" fill="#FFFFFF">${order}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function CourseRouteMap({
  stops,
  polyline,
  connectRoute = true,
  activeOrder = null,
  onSelectStop,
  headerTitle = "데이트 동선 맵",
  heightClassName = "h-80 lg:h-[420px]",
  footerNode,
}: CourseRouteMapProps) {
  const apiKey = getConfiguredGoogleMapsApiKey();
  const [mapMode, setMapMode] = useState<"google" | "vector">(() =>
    apiKey ? "google" : "vector",
  );
  const [selectedVectorStopId, setSelectedVectorStopId] = useState<
    number | null
  >(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<GoogleMapInstance | null>(null);
  const markersRef = useRef<GoogleMarkerInstance[]>([]);
  const polylineRef = useRef<GooglePolylineInstance | null>(null);
  const infoWindowRef = useRef<GoogleInfoWindowInstance | null>(null);
  const onSelectStopRef = useRef(onSelectStop);

  useEffect(() => {
    onSelectStopRef.current = onSelectStop;
  }, [onSelectStop]);

  useEffect(() => {
    if (!apiKey || mapMode !== "google") {
      return;
    }

    let cancelled = false;
    const unsubscribeAuthError = subscribeGoogleMapsAuthFailure(() => {
      if (!cancelled) {
        setMapMode("vector");
      }
    });

    loadGoogleMapsApi(apiKey)
      .then((gmaps) => {
        if (cancelled || !mapContainerRef.current) {
          return;
        }

        const defaultCenter =
          stops.length > 0
            ? { lat: stops[0].latitude, lng: stops[0].longitude }
            : { lat: 37.54458, lng: 127.05597 };

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new gmaps.Map(mapContainerRef.current, {
            center: defaultCenter,
            zoom: 15,
            disableDefaultUI: true,
            zoomControl: true,
            clickableIcons: false,
            gestureHandling: "greedy",
            styles: DAYT_WARM_MAP_STYLES,
          });
          infoWindowRef.current = new gmaps.InfoWindow();
        }

        const map = mapInstanceRef.current;

        // Clear existing markers & polyline
        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = [];
        if (polylineRef.current) {
          polylineRef.current.setMap(null);
          polylineRef.current = null;
        }

        if (stops.length === 0) {
          map.setCenter(defaultCenter);
          map.setZoom(14);
          return;
        }

        const bounds = new gmaps.LatLngBounds();

        stops.forEach((stop) => {
          const pos = { lat: stop.latitude, lng: stop.longitude };
          bounds.extend(pos);
          const isActive = activeOrder === stop.order;

          const marker = new gmaps.Marker({
            position: pos,
            map,
            title: `${stop.order}. ${stop.name}`,
            zIndex: isActive ? 100 : stop.order,
            icon: {
              url: buildNumberedMarkerSvgUrl(stop.order, isActive),
              scaledSize: new gmaps.Size(36, 36),
              anchor: new gmaps.Point(18, 18),
            },
          });

          marker.addListener("click", () => {
            const metaParts: string[] = [escapeHtml(stop.categoryLabel)];
            if (typeof stop.stayMinutes === "number") {
              metaParts.push(`${stop.stayMinutes}분 체류`);
            }
            if (typeof stop.estimatedCost === "number") {
              metaParts.push(
                stop.estimatedCost === 0
                  ? "무료"
                  : `2인 ${stop.estimatedCost.toLocaleString()}원`,
              );
            }

            infoWindowRef.current?.setContent(
              `<div style="padding:4px 6px;font-family:sans-serif;min-width:160px;">
                <div style="font-size:11px;font-weight:700;color:#E85D3F;">#${stop.order} ${metaParts.join(" · ")}</div>
                <div style="font-size:13px;font-weight:800;color:#1C1917;margin-top:2px;">${escapeHtml(stop.name)}</div>
                <div style="font-size:11px;color:#57534E;margin-top:2px;">${escapeHtml(stop.address)}</div>
              </div>`,
            );
            infoWindowRef.current?.open({ map, anchor: marker });
            onSelectStopRef.current?.(stop);
          });

          markersRef.current.push(marker);
        });

        const pathPoints =
          polyline && polyline.length >= 2
            ? polyline.map((pt) => ({ lat: pt.latitude, lng: pt.longitude }))
            : stops.map((s) => ({ lat: s.latitude, lng: s.longitude }));

        if (connectRoute && pathPoints.length >= 2) {
          polylineRef.current = new gmaps.Polyline({
            path: pathPoints,
            geodesic: true,
            strokeColor: "#E85D3F",
            strokeOpacity: 0.92,
            strokeWeight: 4,
            icons: [
              {
                icon: {
                  path: gmaps.SymbolPath.FORWARD_CLOSED_ARROW,
                  scale: 3,
                  strokeColor: "#E85D3F",
                  fillColor: "#E85D3F",
                  fillOpacity: 1,
                },
                offset: "50%",
                repeat: "90px",
              },
            ],
            map,
          });
        }

        if (stops.length === 1) {
          map.setCenter({ lat: stops[0].latitude, lng: stops[0].longitude });
          map.setZoom(16);
        } else {
          map.fitBounds(bounds, { top: 48, right: 48, bottom: 72, left: 48 });
        }

        if (activeOrder !== null) {
          const target = stops.find((s) => s.order === activeOrder);
          if (target) {
            map.panTo({ lat: target.latitude, lng: target.longitude });
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMapMode("vector");
        }
      });

    return () => {
      cancelled = true;
      unsubscribeAuthError();
    };
  }, [apiKey, mapMode, stops, polyline, connectRoute, activeOrder]);

  // Normalized coordinates for interactive WGS84 vector fallback mode
  const vectorPins = useMemo(() => {
    if (stops.length === 0) return [];
    const lats = stops.map((s) => s.latitude);
    const lngs = stops.map((s) => s.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latSpan = Math.max(maxLat - minLat, 0.004);
    const lngSpan = Math.max(maxLng - minLng, 0.004);

    return stops.map((stop) => {
      const xPercent =
        stops.length === 1
          ? 50
          : 16 + ((stop.longitude - minLng) / lngSpan) * 68;
      const yPercent =
        stops.length === 1
          ? 44
          : 72 - ((stop.latitude - minLat) / latSpan) * 52;
      return {
        stop,
        xPercent,
        yPercent,
      };
    });
  }, [stops]);

  const vectorSegments = useMemo(() => {
    if (!connectRoute || vectorPins.length < 2) return [];
    const segments: {
      key: string;
      midX: number;
      midY: number;
      distanceLabel: string;
      minutes: number;
    }[] = [];

    for (let i = 0; i < vectorPins.length - 1; i++) {
      const a = vectorPins[i];
      const b = vectorPins[i + 1];
      const walk = estimateWalkingRoute(
        a.stop.latitude,
        a.stop.longitude,
        b.stop.latitude,
        b.stop.longitude,
      );
      segments.push({
        key: `${a.stop.id}-${b.stop.id}-${i}`,
        midX: (a.xPercent + b.xPercent) / 2,
        midY: (a.yPercent + b.yPercent) / 2,
        distanceLabel: formatDistanceKo(walk.walkingMeters),
        minutes: walk.walkingMinutes,
      });
    }
    return segments;
  }, [connectRoute, vectorPins]);

  const activeVectorStop = useMemo(() => {
    if (selectedVectorStopId !== null) {
      const byId = stops.find((s) => s.id === selectedVectorStopId);
      if (byId) return byId;
    }
    if (activeOrder !== null) {
      return stops.find((s) => s.order === activeOrder) ?? null;
    }
    return null;
  }, [stops, selectedVectorStopId, activeOrder]);

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_12px_36px_rgba(24,24,27,0.05)]">
      {/* Map Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" />
          <span className="text-xs font-extrabold text-foreground">
            {headerTitle}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-bold text-primary">
          <Navigation className="h-3 w-3" />
          <span>
            {mapMode === "google" ? "Google Maps 동선" : "WGS84 실시간 동선 맵"}
          </span>
        </span>
      </div>

      {/* Canvas Container */}
      <div className={`relative bg-[#F4F1EA] ${heightClassName}`}>
        {mapMode === "google" ? (
          <div ref={mapContainerRef} className="h-full w-full" />
        ) : (
          <div className="relative h-full w-full p-6">
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
              aria-hidden="true"
            >
              <defs>
                <marker
                  id="dayt-route-arrow"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="4"
                  markerHeight="4"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#E85D3F" />
                </marker>
              </defs>
              {/* Subtle Editorial Road Grid */}
              <path
                d="M0 24 Q42 30 100 16"
                stroke="#E7E2D8"
                strokeWidth="3.5"
                fill="none"
              />
              <path
                d="M22 0 L34 100"
                stroke="#E7E2D8"
                strokeWidth="2.8"
                fill="none"
              />
              <path
                d="M72 0 L64 100"
                stroke="#EAE5DC"
                strokeWidth="2.2"
                fill="none"
              />
              <path
                d="M0 68 L100 54"
                stroke="#E7E2D8"
                strokeWidth="4.2"
                fill="none"
              />

              {/* Connected Route Polyline Segments */}
              {connectRoute &&
                vectorPins.length >= 2 &&
                vectorPins.slice(0, -1).map((pin, idx) => {
                  const nextPin = vectorPins[idx + 1];
                  return (
                    <line
                      key={`line-${pin.stop.id}-${nextPin.stop.id}-${idx}`}
                      x1={pin.xPercent}
                      y1={pin.yPercent}
                      x2={nextPin.xPercent}
                      y2={nextPin.yPercent}
                      stroke="#E85D3F"
                      strokeWidth="1.35"
                      strokeDasharray="2.6 1.6"
                      markerEnd="url(#dayt-route-arrow)"
                    />
                  );
                })}
            </svg>

            {/* Segment Walking Badges */}
            {vectorSegments.map((seg) => (
              <div
                key={seg.key}
                style={{
                  left: `${seg.midX}%`,
                  top: `${seg.midY}%`,
                }}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/25 bg-surface/90 px-2 py-0.5 text-[10px] font-bold text-primary shadow-2xs"
              >
                도보 {seg.minutes}분 · {seg.distanceLabel}
              </div>
            ))}

            {/* Empty State */}
            {vectorPins.length === 0 && (
              <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
                <MapPin className="h-7 w-7 text-primary/60" />
                <p className="mt-2 text-xs font-extrabold text-foreground">
                  경유지를 추가하면 동선이 지도에 표시됩니다
                </p>
              </div>
            )}

            {/* Numbered Stop Markers */}
            {vectorPins.map((pin) => {
              const isFocused =
                activeVectorStop?.id === pin.stop.id ||
                activeOrder === pin.stop.order;
              return (
                <button
                  key={`${pin.stop.id}-${pin.stop.order}`}
                  type="button"
                  onClick={() => {
                    setSelectedVectorStopId(pin.stop.id);
                    onSelectStop?.(pin.stop);
                  }}
                  style={{
                    left: `${pin.xPercent}%`,
                    top: `${pin.yPercent}%`,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold shadow-md transition-transform hover:scale-105 ${
                    isFocused
                      ? "z-20 bg-surface-dark text-white ring-2 ring-amber-300"
                      : "z-10 bg-surface text-foreground ring-1 ring-primary/45"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-black ${
                      isFocused
                        ? "bg-amber-300 text-surface-dark"
                        : "bg-primary text-white"
                    }`}
                  >
                    {pin.stop.order}
                  </span>
                  <span className="max-w-24 truncate">{pin.stop.name}</span>
                </button>
              );
            })}

            {/* Selected Pin Floating Info Pill */}
            {activeVectorStop && !footerNode && (
              <div className="absolute inset-x-4 bottom-4 z-20 flex items-center justify-between gap-3 rounded-2xl border border-white/70 bg-surface/95 px-4 py-3 shadow-sm backdrop-blur-md">
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold text-primary">
                    #{activeVectorStop.order} {activeVectorStop.categoryLabel}
                    {typeof activeVectorStop.stayMinutes === "number"
                      ? ` · ${activeVectorStop.stayMinutes}분 체류`
                      : ""}
                  </p>
                  <p className="truncate text-xs font-extrabold text-foreground">
                    {activeVectorStop.name}
                  </p>
                  <p className="truncate text-[11px] text-muted">
                    {activeVectorStop.address}
                  </p>
                </div>
                {activeVectorStop.placeUrl && (
                  <a
                    href={activeVectorStop.placeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-soft px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary hover:text-white"
                  >
                    <span>상세</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Custom Footer Overlay (e.g., Draft Summary in Explore) */}
        {footerNode && (
          <div className="absolute inset-x-4 bottom-4 z-20 rounded-2xl border border-white/60 bg-surface/93 p-3.5 shadow-sm backdrop-blur-md">
            {footerNode}
          </div>
        )}
      </div>
    </div>
  );
}

