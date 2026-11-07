"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  Coffee,
  ExternalLink,
  Landmark,
  Loader2,
  LocateFixed,
  MapPin,
  Maximize2,
  Minimize2,
  Minus,
  Palette,
  Plus,
  RotateCw,
  SquareParking,
  Ticket,
  TrainFront,
  Trees,
  UtensilsCrossed,
  X,
} from "lucide-react";
import type { LatLngPoint, PlaceCategoryGroup } from "@/shared/api/types";
import {
  calculateStraightMeters,
  estimateWalkingRoute,
  formatDistanceKo,
} from "./geo-utils";
import {
  DAYT_MAP_THEMES,
  getConfiguredGoogleMapsApiKey,
  loadGoogleMapsApi,
  subscribeGoogleMapsAuthFailure,
  type DaytMapThemeId,
  type GoogleInfoWindowInstance,
  type GoogleMapInstance,
  type GoogleMarkerInstance,
  type GooglePolylineInstance,
  type GoogleTransitLayerInstance,
} from "./google-maps-loader";
import {
  buildFallbackMapContext,
  type MapSurroundingContext,
  type SubwayStationPoi,
  type SurroundingPoi,
} from "./map-context";
import {
  MAX_MAP_ZOOM,
  MIN_MAP_ZOOM,
  clampZoom,
  computeBestFitViewport,
  computeMetricScaleBar,
  getVisibleOsmTiles,
  latLngToContainerPx,
  panViewportByPixels,
  type MapViewportState,
} from "./slippy-tile-math";

export interface RouteMapStop {
  id: number;
  order: number;
  name: string;
  address: string;
  categoryLabel: string;
  categoryGroup?: PlaceCategoryGroup;
  latitude: number;
  longitude: number;
  stayMinutes?: number;
  estimatedCost?: number;
  memo?: string | null;
  placeUrl?: string | null;
  isDraft?: boolean;
}

export interface MapAreaSearchRequest {
  latitude: number;
  longitude: number;
  areaHint?: string;
}

interface CourseRouteMapProps {
  stops: RouteMapStop[];
  polyline?: LatLngPoint[];
  connectRoute?: boolean;
  activeOrder?: number | null;
  selectedStopId?: number | null;
  onSelectStop?: (stop: RouteMapStop) => void;
  searchAnchor?: { latitude: number; longitude: number } | null;
  onSearchInArea?: (area: MapAreaSearchRequest) => void;
  isSearchingArea?: boolean;
  headerTitle?: string;
  heightClassName?: string;
  footerNode?: ReactNode;
}

type SelectedContextTarget =
  | { type: "STATION"; station: SubwayStationPoi }
  | { type: "POI"; poi: SurroundingPoi }
  | null;

export function getStopCategoryVisual(
  categoryGroup?: PlaceCategoryGroup,
  categoryLabel = "",
) {
  if (categoryGroup === "CAFE" || categoryLabel.includes("카페")) {
    return { icon: Coffee, color: "#B45309", bg: "bg-amber-600" };
  }
  if (categoryGroup === "RESTAURANT" || categoryLabel.includes("식당")) {
    return { icon: UtensilsCrossed, color: "#E11D48", bg: "bg-rose-600" };
  }
  if (categoryGroup === "ACTIVITY" || categoryLabel.includes("액티비티")) {
    return { icon: Ticket, color: "#4F46E5", bg: "bg-indigo-600" };
  }
  if (
    categoryGroup === "EXHIBITION" ||
    categoryLabel.includes("전시") ||
    categoryLabel.includes("문화")
  ) {
    return { icon: Palette, color: "#9333EA", bg: "bg-purple-600" };
  }
  if (
    categoryGroup === "PARK" ||
    categoryLabel.includes("공원") ||
    categoryLabel.includes("산책")
  ) {
    return { icon: Trees, color: "#059669", bg: "bg-emerald-600" };
  }
  return { icon: MapPin, color: "#E85D3F", bg: "bg-primary" };
}

function buildCategoryMarkerSvgUrl(
  categoryGroup?: PlaceCategoryGroup,
  categoryLabel = "",
  isActive = false,
): string {
  const visual = getStopCategoryVisual(categoryGroup, categoryLabel);
  const fill = isActive ? "#1C1917" : visual.color;
  const ring = isActive ? "#FBBF24" : "#FFFFFF";

  let iconPath = "";
  if (categoryGroup === "CAFE" || categoryLabel.includes("카페")) {
    iconPath = `<path d="M12 11V18C12 19.1 12.9 20 14 20H18C19.1 20 20 19.1 20 18V11H12ZM20 13H22C22.6 13 23 13.4 23 14V16C23 16.6 22.6 17 22 17H20V13ZM11 22H21V23H11V22Z" fill="#FFFFFF"/>`;
  } else if (categoryGroup === "RESTAURANT" || categoryLabel.includes("식당")) {
    iconPath = `<path d="M13 10V14C13 14.8 13.5 15.4 14.2 15.8V22H15.8V15.8C16.5 15.4 17 14.8 17 14V10H16V13H15V10H14V13H13V10ZM19 10C18.2 10 17.6 10.9 17.6 12.2V15H18.8V22H20.2V10H19Z" fill="#FFFFFF"/>`;
  } else if (
    categoryGroup === "PARK" ||
    categoryLabel.includes("공원") ||
    categoryLabel.includes("산책")
  ) {
    iconPath = `<path d="M16 9L12 14.5H14.2L12.5 17.5H19.5L17.8 14.5H20L16 9Z" fill="#FFFFFF"/><rect x="15.2" y="17.2" width="1.6" height="3" rx="0.4" fill="#FFFFFF"/>`;
  } else if (
    categoryGroup === "EXHIBITION" ||
    categoryLabel.includes("전시") ||
    categoryLabel.includes("문화")
  ) {
    iconPath = `<circle cx="16" cy="15" r="5.5" stroke="#FFFFFF" stroke-width="1.6" fill="none"/><circle cx="14" cy="13.5" r="1.1" fill="#FFFFFF"/><circle cx="18" cy="13.5" r="1.1" fill="#FFFFFF"/><circle cx="16" cy="17" r="1.1" fill="#FFFFFF"/>`;
  } else {
    iconPath = `<path d="M16 9C14 9 12.5 10.5 12.5 12.5C12.5 15.5 16 20.5 16 20.5C16 20.5 19.5 15.5 19.5 12.5C19.5 10.5 18 9 16 9ZM16 14C15.2 14 14.5 13.3 14.5 12.5C14.5 11.7 15.2 11 16 11C16.8 11 17.5 11.7 17.5 12.5C17.5 13.3 16.8 14 16 14Z" fill="#FFFFFF"/>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="13.5" fill="${fill}" stroke="${ring}" stroke-width="2.5"/>
    ${iconPath}
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildStationMarkerSvgUrl(primaryColor: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="13.5" fill="#0F172A" stroke="#FFFFFF" stroke-width="2.5"/>
    <rect x="9.5" y="8.5" width="13" height="12" rx="3" fill="${primaryColor}" stroke="#FFFFFF" stroke-width="1.3"/>
    <rect x="11.5" y="10.8" width="9" height="4.2" rx="1" fill="#FFFFFF"/>
    <circle cx="12.5" cy="17.8" r="1.1" fill="#FFFFFF"/>
    <circle cx="19.5" cy="17.8" r="1.1" fill="#FFFFFF"/>
    <path d="M12 20.8L10.5 23.2M20 20.8L21.5 23.2" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildPoiMarkerSvgUrl(kind: SurroundingPoi["kind"]): string {
  if (kind === "PARKING") {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">
      <rect x="2.5" y="2.5" width="21" height="21" rx="6" fill="#2563EB" stroke="#FFFFFF" stroke-width="2"/>
      <path d="M10.2 17.5V8.5H14.2C16 8.5 17.2 9.6 17.2 11.3C17.2 13 16 14.1 14.2 14.1H12.2V17.5H10.2ZM12.2 12.4H13.9C14.8 12.4 15.3 11.9 15.3 11.3C15.3 10.6 14.8 10.2 13.9 10.2H12.2V12.4Z" fill="#FFFFFF"/>
    </svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  if (kind === "PARK") {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">
      <circle cx="13" cy="13" r="11" fill="#059669" stroke="#FFFFFF" stroke-width="2"/>
      <path d="M13 6.8L8.5 13.2H11L9.2 16.5H16.8L15 13.2H17.5L13 6.8Z" fill="#FFFFFF"/>
      <rect x="12.1" y="16.2" width="1.8" height="3" rx="0.5" fill="#FFFFFF"/>
    </svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">
    <circle cx="13" cy="13" r="11" fill="#0D9488" stroke="#FFFFFF" stroke-width="2"/>
    <path d="M13 7.2L7.8 10.2V11.5H18.2V10.2L13 7.2ZM9.4 12.5V16.8H11V12.5H9.4ZM12.2 12.5V16.8H13.8V12.5H12.2ZM15 12.5V16.8H16.6V12.5H15ZM8 17.8V19.2H18V17.8H8Z" fill="#FFFFFF"/>
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

function computeZoomQueryRadius(zoom: number): number {
  if (zoom <= 12) return 5500;
  if (zoom === 13) return 4000;
  if (zoom === 14) return 2800;
  if (zoom === 15) return 2000;
  return 1500;
}

function mergeSurroundingContext(
  prev: MapSurroundingContext,
  incoming: MapSurroundingContext,
  centerLat: number,
  centerLng: number,
): MapSurroundingContext {
  const stationMap = new Map<string, SubwayStationPoi>();
  for (const s of [...incoming.stations, ...prev.stations]) {
    const dist = Math.round(
      calculateStraightMeters(centerLat, centerLng, s.latitude, s.longitude),
    );
    const existing = stationMap.get(s.name);
    if (!existing) {
      stationMap.set(s.name, { ...s, distanceMeters: dist });
    } else {
      const mergedLines = [...existing.lines];
      for (const l of s.lines) {
        if (!mergedLines.some((m) => m.label === l.label)) {
          mergedLines.push(l);
        }
      }
      stationMap.set(s.name, {
        ...existing,
        lines: mergedLines,
        distanceMeters: Math.min(existing.distanceMeters, dist),
      });
    }
  }

  const mergePois = (
    listA: SurroundingPoi[],
    listB: SurroundingPoi[],
    limit: number,
  ): SurroundingPoi[] => {
    const map = new Map<string, SurroundingPoi>();
    for (const item of [...listA, ...listB]) {
      const dist = Math.round(
        calculateStraightMeters(
          centerLat,
          centerLng,
          item.latitude,
          item.longitude,
        ),
      );
      if (!map.has(item.name)) {
        map.set(item.name, { ...item, distanceMeters: dist });
      }
    }
    return Array.from(map.values())
      .filter((p) => p.distanceMeters <= 8000)
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, limit);
  };

  return {
    stations: Array.from(stationMap.values())
      .filter((s) => s.distanceMeters <= 8000)
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, 18),
    landmarks: mergePois(incoming.landmarks, prev.landmarks, 20),
    parkings: mergePois(incoming.parkings, prev.parkings, 14),
    source: incoming.source,
  };
}

export function CourseRouteMap({
  stops,
  polyline,
  connectRoute = true,
  activeOrder = null,
  selectedStopId: externalSelectedStopId = null,
  onSelectStop,
  searchAnchor = null,
  onSearchInArea,
  isSearchingArea = false,
  headerTitle = "데이트 동선 맵",
  heightClassName = "h-80 lg:h-[440px]",
  footerNode,
}: CourseRouteMapProps) {
  const apiKey = getConfiguredGoogleMapsApiKey();
  const [mapMode, setMapMode] = useState<"google" | "tile">(() =>
    apiKey ? "google" : "tile",
  );
  const [themeId, setThemeId] = useState<DaytMapThemeId>("WARM");
  const activeTheme = DAYT_MAP_THEMES[themeId];

  const [isExpanded, setIsExpanded] = useState(false);
  // Default layer visibility set to false per user requirement (subway, landmarks, parking start OFF)
  const [showSubwayLayer, setShowSubwayLayer] = useState(false);
  const [showLandmarkLayer, setShowLandmarkLayer] = useState(false);
  const [showParkingLayer, setShowParkingLayer] = useState(false);

  const [internalSelectedStopId, setInternalSelectedStopId] = useState<number | null>(null);
  const selectedStopId = externalSelectedStopId ?? internalSelectedStopId;
  const setSelectedStopId = useCallback((id: number | null) => {
    setInternalSelectedStopId(id);
  }, []);
  const [hoveredStopId, setHoveredStopId] = useState<number | null>(null);
  const [selectedContext, setSelectedContext] =
    useState<SelectedContextTarget>(null);

  const stopsAnchor = useMemo(() => {
    if (stops.length === 0) {
      return searchAnchor
        ? {
            lat: searchAnchor.latitude,
            lng: searchAnchor.longitude,
            radius: 2000,
          }
        : { lat: 37.54458, lng: 127.05597, radius: 2000 };
    }
    const sumLat = stops.reduce((acc, s) => acc + s.latitude, 0);
    const sumLng = stops.reduce((acc, s) => acc + s.longitude, 0);
    const centerLat = sumLat / stops.length;
    const centerLng = sumLng / stops.length;

    let maxSpreadMeters = 900;
    for (const s of stops) {
      const walk = estimateWalkingRoute(
        centerLat,
        centerLng,
        s.latitude,
        s.longitude,
      );
      if (walk.walkingMeters > maxSpreadMeters) {
        maxSpreadMeters = walk.walkingMeters;
      }
    }
    return {
      lat: Math.round(centerLat * 1000) / 1000,
      lng: Math.round(centerLng * 1000) / 1000,
      radius: Math.min(Math.max(Math.round(maxSpreadMeters + 900), 2000), 5000),
    };
  }, [stops, searchAnchor]);

  const [surrounding, setSurrounding] = useState<MapSurroundingContext>(() =>
    buildFallbackMapContext(
      stopsAnchor.lat,
      stopsAnchor.lng,
      stopsAnchor.radius,
    ),
  );

  // Container size measurement for exact Web Mercator tile & pin projection
  const tileContainerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState<{
    width: number;
    height: number;
  }>({ width: 520, height: 420 });

  useEffect(() => {
    const node = tileContainerRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.round(entry.contentRect.width);
      const h = Math.round(entry.contentRect.height);
      if (w > 40 && h > 40) {
        setContainerSize((prev) =>
          prev.width === w && prev.height === h ? prev : { width: w, height: h },
        );
      }
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [mapMode, isExpanded]);

  const currentAnchorKey = useMemo(() => {
    if (searchAnchor) {
      return `${searchAnchor.latitude.toFixed(4)},${searchAnchor.longitude.toFixed(4)}`;
    }
    return "default-anchor";
  }, [searchAnchor]);

  // Stable anchor center (guarantees map stays 100% steady when user filters categories or foods)
  const defaultAnchorCenter = useMemo<MapViewportState>(() => {
    if (searchAnchor) {
      return {
        centerLat: searchAnchor.latitude,
        centerLng: searchAnchor.longitude,
        zoom: 15,
      };
    }
    if (stops.length > 0) {
      return {
        centerLat: stops[0].latitude,
        centerLng: stops[0].longitude,
        zoom: 15,
      };
    }
    return {
      centerLat: 37.54458,
      centerLng: 127.05597,
      zoom: 15,
    };
  }, [searchAnchor, stops]);

  const [currentViewport, setCurrentViewport] =
    useState<MapViewportState>(defaultAnchorCenter);
  const [settledCenter, setSettledCenter] = useState<{
    lat: number;
    lng: number;
  }>(() => ({
    lat: defaultAnchorCenter.centerLat,
    lng: defaultAnchorCenter.centerLng,
  }));
  const lastKnownAnchorRef = useRef<string>(currentAnchorKey);

  // Only update map center when user explicitly searches a brand new area via search bar, preserving user zoom
  useEffect(() => {
    if (lastKnownAnchorRef.current !== currentAnchorKey) {
      lastKnownAnchorRef.current = currentAnchorKey;
      setCurrentViewport((prev) => ({
        centerLat: defaultAnchorCenter.centerLat,
        centerLng: defaultAnchorCenter.centerLng,
        zoom: prev.zoom, // Preserve current zoom level
      }));
      setSettledCenter({
        lat: defaultAnchorCenter.centerLat,
        lng: defaultAnchorCenter.centerLng,
      });
    }
  }, [currentAnchorKey, defaultAnchorCenter]);

  const activeFocusedViewport = useMemo<MapViewportState | null>(() => {
    if (activeOrder === null) return null;
    const target = stops.find((s) => s.order === activeOrder);
    if (!target) return null;
    return {
      centerLat: target.latitude,
      centerLng: target.longitude,
      zoom: Math.max(currentViewport.zoom, 16),
    };
  }, [activeOrder, stops, currentViewport.zoom]);

  const viewport: MapViewportState = useMemo(() => {
    if (activeFocusedViewport) {
      return activeFocusedViewport;
    }
    return currentViewport;
  }, [activeFocusedViewport, currentViewport]);

  const commitViewport = useCallback(
    (next: MapViewportState, isSettled = false) => {
      setCurrentViewport({
        centerLat: next.centerLat,
        centerLng: next.centerLng,
        zoom: clampZoom(next.zoom),
      });
      if (isSettled) {
        setSettledCenter({
          lat: next.centerLat,
          lng: next.centerLng,
        });
      }
    },
    [],
  );

  // Google Maps JS API state
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<GoogleMapInstance | null>(null);
  const transitLayerRef = useRef<GoogleTransitLayerInstance | null>(null);
  const markersRef = useRef<GoogleMarkerInstance[]>([]);
  const contextMarkersRef = useRef<GoogleMarkerInstance[]>([]);
  const polylineRef = useRef<GooglePolylineInstance | null>(null);
  const infoWindowRef = useRef<GoogleInfoWindowInstance | null>(null);
  const onSelectStopRef = useRef(onSelectStop);
  const lastFitAnchorKeyRef = useRef<string>("");
  const [googleView, setGoogleView] = useState<{
    lat: number;
    lng: number;
    zoom: number;
  }>({
    lat: stopsAnchor.lat,
    lng: stopsAnchor.lng,
    zoom: 15,
  });

  useEffect(() => {
    onSelectStopRef.current = onSelectStop;
  }, [onSelectStop]);

  // Active viewport center (works across both Tile and Google Maps modes)
  const activeCenter = useMemo(() => {
    if (mapMode === "google") {
      return {
        lat: googleView.lat,
        lng: googleView.lng,
        zoom: googleView.zoom,
      };
    }
    return {
      lat: viewport.centerLat,
      lng: viewport.centerLng,
      zoom: viewport.zoom,
    };
  }, [mapMode, googleView, viewport]);

  const [isDragging, setIsDragging] = useState(false);

  // Debounced fetch of surrounding context (stations, landmarks, parking) only when active and not actively dragging
  useEffect(() => {
    const isAnyLayerActive =
      showSubwayLayer || showLandmarkLayer || showParkingLayer;
    if (!isAnyLayerActive || isDragging) {
      return;
    }

    let active = true;
    let started = false;
    const controller = new AbortController();

    const roundedLat = Math.round(activeCenter.lat * 1000) / 1000;
    const roundedLng = Math.round(activeCenter.lng * 1000) / 1000;
    const queryRadius = computeZoomQueryRadius(activeCenter.zoom);

    const timer = setTimeout(async () => {
      if (!active) return;
      started = true;
      try {
        const params = new URLSearchParams({
          lat: String(roundedLat),
          lng: String(roundedLng),
          radius: String(queryRadius),
        });
        const res = await fetch(`/api/map/context?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!active || !res.ok) return;
        const data = (await res.json()) as MapSurroundingContext;
        if (active && Array.isArray(data.stations)) {
          setSurrounding((prev) =>
            mergeSurroundingContext(prev, data, roundedLat, roundedLng),
          );
        }
      } catch (err: unknown) {
        if (!active || (err instanceof Error && err.name === "AbortError")) {
          return;
        }
        if (active) {
          const fb = buildFallbackMapContext(
            roundedLat,
            roundedLng,
            queryRadius,
          );
          setSurrounding((prev) =>
            mergeSurroundingContext(prev, fb, roundedLat, roundedLng),
          );
        }
      }
    }, 450);

    return () => {
      active = false;
      clearTimeout(timer);
      if (started) {
        try {
          controller.abort();
        } catch {
          // Ignore
        }
      }
    };
  }, [
    activeCenter.lat,
    activeCenter.lng,
    activeCenter.zoom,
    showSubwayLayer,
    showLandmarkLayer,
    showParkingLayer,
    isDragging,
  ]);

  // Closest stations sorted relative to settled map center (no recalculation jitter while dragging)
  // Showing at most 2 stations as per user request
  const visibleClosestStations = useMemo(() => {
    return [...surrounding.stations]
      .map((st) => ({
        ...st,
        distanceFromCenter: Math.round(
          calculateStraightMeters(
            settledCenter.lat,
            settledCenter.lng,
            st.latitude,
            st.longitude,
          ),
        ),
      }))
      .sort((a, b) => a.distanceFromCenter - b.distanceFromCenter)
      .slice(0, 2);
  }, [surrounding.stations, settledCenter.lat, settledCenter.lng]);

  // Mouse wheel zoom inside tile canvas without scrolling page
  const viewportRef = useRef(viewport);
  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    const node = tileContainerRef.current;
    if (!node || mapMode !== "tile") return;

    let lastWheelAt = 0;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const now = Date.now();
      if (now - lastWheelAt < 110) return;
      lastWheelAt = now;

      const cur = viewportRef.current;
      const delta = e.deltaY < 0 ? 1 : -1;
      const nextZoom = clampZoom(cur.zoom + delta);
      if (nextZoom !== cur.zoom) {
        commitViewport({
          centerLat: cur.centerLat,
          centerLng: cur.centerLng,
          zoom: nextZoom,
        }, true);
      }
    }

    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [mapMode, commitViewport]);

  // Pointer drag panning for tile mode
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    moved: boolean;
  } | null>(null);

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (mapMode !== "tile") return;
    const targetEl = e.target as HTMLElement;
    if (targetEl.closest("button, a")) {
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      moved: false,
    };
    setIsDragging(true);
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const st = dragStateRef.current;
    if (!st || st.pointerId !== e.pointerId) return;

    const dx = e.clientX - st.lastX;
    const dy = e.clientY - st.lastY;
    if (
      !st.moved &&
      Math.hypot(e.clientX - st.startX, e.clientY - st.startY) > 4
    ) {
      st.moved = true;
    }
    if (dx !== 0 || dy !== 0) {
      st.lastX = e.clientX;
      st.lastY = e.clientY;
      commitViewport(panViewportByPixels(viewportRef.current, dx, dy));
    }
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const st = dragStateRef.current;
    if (!st || st.pointerId !== e.pointerId) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragStateRef.current = null;
    setIsDragging(false);
    const finalVp = viewportRef.current;
    setSettledCenter({
      lat: finalVp.centerLat,
      lng: finalVp.centerLng,
    });
  }

  // Google Maps Effect 1: Stops & Route Polyline (only fits bounds when stops/route change)
  useEffect(() => {
    if (!apiKey || mapMode !== "google") {
      return;
    }

    let cancelled = false;
    const unsubscribeAuthError = subscribeGoogleMapsAuthFailure(() => {
      if (!cancelled) {
        setMapMode("tile");
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
            : searchAnchor
              ? { lat: searchAnchor.latitude, lng: searchAnchor.longitude }
              : { lat: 37.54458, lng: 127.05597 };

        if (!mapInstanceRef.current) {
          const mapInst = new gmaps.Map(mapContainerRef.current, {
            center: defaultCenter,
            zoom: 15,
            disableDefaultUI: true,
            scaleControl: true,
            clickableIcons: true,
            gestureHandling: "greedy",
            styles: activeTheme.googleStyles,
          });
          mapInst.addListener("dragstart", () => {
            setIsDragging(true);
          });
          mapInst.addListener("dragend", () => {
            setIsDragging(false);
          });
          mapInst.addListener("idle", () => {
            setIsDragging(false);
            const c = mapInst.getCenter?.();
            const z = mapInst.getZoom();
            if (c) {
              const nextCenter = { lat: c.lat(), lng: c.lng() };
              setGoogleView((prev) => ({
                ...nextCenter,
                zoom: typeof z === "number" ? z : prev.zoom,
              }));
              setSettledCenter(nextCenter);
            }
          });
          mapInstanceRef.current = mapInst;
          infoWindowRef.current = new gmaps.InfoWindow();
          transitLayerRef.current = new gmaps.TransitLayer();
        } else {
          mapInstanceRef.current.setOptions({
            styles: activeTheme.googleStyles,
          });
        }

        const map = mapInstanceRef.current;

        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = [];
        if (polylineRef.current) {
          polylineRef.current.setMap(null);
          polylineRef.current = null;
        }

        if (stops.length === 0) {
          map.setCenter(defaultCenter);
          map.setZoom(15);
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
            zIndex: isActive ? 100 : 20 + stop.order,
            icon: {
              url: buildCategoryMarkerSvgUrl(
                stop.categoryGroup,
                stop.categoryLabel,
                isActive,
              ),
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
            setSelectedStopId(stop.id);
            onSelectStopRef.current?.(stop);
          });

          markersRef.current.push(marker);
        });

        const draftOnlyStops = stops.filter((s) => s.isDraft);
        const stopsToConnect =
          draftOnlyStops.length >= 2
            ? draftOnlyStops
            : stops.every((s) => s.isDraft) && stops.length >= 2
              ? stops
              : [];

        const pathPoints =
          polyline && polyline.length >= 2
            ? polyline.map((pt) => ({ lat: pt.latitude, lng: pt.longitude }))
            : stopsToConnect.map((s) => ({ lat: s.latitude, lng: s.longitude }));

        if (connectRoute && pathPoints.length >= 2) {
          polylineRef.current = new gmaps.Polyline({
            path: pathPoints,
            geodesic: true,
            strokeColor: activeTheme.routeStroke,
            strokeOpacity: 0.92,
            strokeWeight: 4,
            icons: [
              {
                icon: {
                  path: gmaps.SymbolPath.FORWARD_CLOSED_ARROW,
                  scale: 3,
                  strokeColor: activeTheme.routeStroke,
                  fillColor: activeTheme.routeStroke,
                  fillOpacity: 1,
                },
                offset: "50%",
                repeat: "90px",
              },
            ],
            map,
          });
        }

        // Only fit bounds on initial load or when explicit searchAnchor changes to a new area
        if (lastFitAnchorKeyRef.current !== currentAnchorKey) {
          lastFitAnchorKeyRef.current = currentAnchorKey;
          if (stops.length === 1) {
            map.setCenter({ lat: stops[0].latitude, lng: stops[0].longitude });
            map.setZoom(16);
          } else {
            map.fitBounds(bounds, { top: 56, right: 56, bottom: 88, left: 56 });
          }
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
          setMapMode("tile");
        }
      });

    return () => {
      cancelled = true;
      unsubscribeAuthError();
    };
  }, [
    apiKey,
    mapMode,
    stops,
    polyline,
    connectRoute,
    activeOrder,
    activeTheme,
    searchAnchor,
    currentAnchorKey,
    setSelectedStopId,
  ]);

  // Google Maps Effect 2: Surrounding Stations, Landmarks/Parks & Parking markers (updates on pan without resetting camera)
  useEffect(() => {
    if (!apiKey || mapMode !== "google") {
      return;
    }
    const map = mapInstanceRef.current;
    const gmaps = window.google?.maps;
    if (!map || !gmaps) {
      return;
    }

    transitLayerRef.current?.setMap(showSubwayLayer ? map : null);
    contextMarkersRef.current.forEach((m) => m.setMap(null));
    contextMarkersRef.current = [];

    if (showSubwayLayer) {
      surrounding.stations.forEach((st) => {
        const primaryColor = st.lines[0]?.color ?? "#0EA5E9";
        const stMarker = new gmaps.Marker({
          position: { lat: st.latitude, lng: st.longitude },
          map,
          title: `${st.name} (${st.lines.map((l) => l.label).join("·")})`,
          zIndex: 8,
          icon: {
            url: buildStationMarkerSvgUrl(primaryColor),
            scaledSize: new gmaps.Size(28, 28),
            anchor: new gmaps.Point(14, 14),
          },
        });
        stMarker.addListener("click", () => {
          setSelectedContext({ type: "STATION", station: st });
        });
        contextMarkersRef.current.push(stMarker);
      });
    }

    if (showLandmarkLayer) {
      surrounding.landmarks.forEach((lm) => {
        const lmMarker = new gmaps.Marker({
          position: { lat: lm.latitude, lng: lm.longitude },
          map,
          title: `${lm.name} (${lm.categoryLabel})`,
          zIndex: 5,
          icon: {
            url: buildPoiMarkerSvgUrl(lm.kind),
            scaledSize: new gmaps.Size(22, 22),
            anchor: new gmaps.Point(11, 11),
          },
        });
        lmMarker.addListener("click", () => {
          setSelectedContext({ type: "POI", poi: lm });
        });
        contextMarkersRef.current.push(lmMarker);
      });
    }

    if (showParkingLayer) {
      surrounding.parkings.forEach((pk) => {
        const pkMarker = new gmaps.Marker({
          position: { lat: pk.latitude, lng: pk.longitude },
          map,
          title: `${pk.name} (주차장)`,
          zIndex: 6,
          icon: {
            url: buildPoiMarkerSvgUrl("PARKING"),
            scaledSize: new gmaps.Size(22, 22),
            anchor: new gmaps.Point(11, 11),
          },
        });
        pkMarker.addListener("click", () => {
          setSelectedContext({ type: "POI", poi: pk });
        });
        contextMarkersRef.current.push(pkMarker);
      });
    }
  }, [
    apiKey,
    mapMode,
    surrounding,
    showSubwayLayer,
    showLandmarkLayer,
    showParkingLayer,
  ]);

  // Detect whether map was panned away from the searched reference center (> 220m)
  // Evaluated against settledCenter so walking time calculations never flicker during active mouse drag
  const hasMovedFromSearchOrigin = useMemo(() => {
    if (!onSearchInArea) return false;
    const refLat = searchAnchor?.latitude ?? defaultAnchorCenter.centerLat;
    const refLng = searchAnchor?.longitude ?? defaultAnchorCenter.centerLng;
    const dist = calculateStraightMeters(
      refLat,
      refLng,
      settledCenter.lat,
      settledCenter.lng,
    );
    return dist >= 220;
  }, [
    onSearchInArea,
    searchAnchor,
    defaultAnchorCenter.centerLat,
    defaultAnchorCenter.centerLng,
    settledCenter.lat,
    settledCenter.lng,
  ]);

  const inferredAreaHint = useMemo(() => {
    const nearestSt = visibleClosestStations[0];
    if (nearestSt && nearestSt.distanceFromCenter <= 1100) {
      return `${nearestSt.name} 주변`;
    }
    const nearestLm = surrounding.landmarks
      .map((lm) => ({
        lm,
        d: calculateStraightMeters(
          activeCenter.lat,
          activeCenter.lng,
          lm.latitude,
          lm.longitude,
        ),
      }))
      .sort((a, b) => a.d - b.d)[0];
    if (nearestLm && nearestLm.d <= 900) {
      return `${nearestLm.lm.name} 주변`;
    }
    return "현재 지도 영역";
  }, [
    visibleClosestStations,
    surrounding.landmarks,
    activeCenter.lat,
    activeCenter.lng,
  ]);

  // Tile Map Projections
  const visibleTiles = useMemo(
    () =>
      getVisibleOsmTiles(viewport, containerSize.width, containerSize.height),
    [viewport, containerSize.width, containerSize.height],
  );

  const activeStop = useMemo(() => {
    if (selectedStopId !== null) {
      const byId = stops.find((s) => s.id === selectedStopId);
      if (byId) return byId;
    }
    if (activeOrder !== null) {
      return stops.find((s) => s.order === activeOrder) ?? null;
    }
    return null;
  }, [stops, selectedStopId, activeOrder]);

  // Project stops into pixel coordinates + smart collision detection so labels never pile up
  const projectedStops = useMemo(() => {
    const raw = stops.map((stop) => {
      const px = latLngToContainerPx(
        stop.latitude,
        stop.longitude,
        viewport,
        containerSize.width,
        containerSize.height,
      );
      const isFocused =
        activeStop?.id === stop.id ||
        activeOrder === stop.order ||
        hoveredStopId === stop.id;
      return {
        stop,
        x: px.x,
        y: px.y,
        isFocused,
        showFullLabel: isFocused,
      };
    });

    const prioritized = [...raw].sort((a, b) => {
      if (a.isFocused !== b.isFocused) return a.isFocused ? -1 : 1;
      return a.stop.order - b.stop.order;
    });

    const occupiedBoxes: { x: number; y: number }[] = [];
    for (const item of prioritized) {
      if (item.isFocused) {
        item.showFullLabel = true;
        occupiedBoxes.push({ x: item.x, y: item.y });
        continue;
      }
      const collides = occupiedBoxes.some(
        (box) => Math.abs(box.x - item.x) < 76 && Math.abs(box.y - item.y) < 34,
      );
      if (!collides) {
        item.showFullLabel = true;
        occupiedBoxes.push({ x: item.x, y: item.y });
      } else {
        item.showFullLabel = false;
      }
    }

    return raw;
  }, [
    stops,
    viewport,
    containerSize.width,
    containerSize.height,
    activeStop?.id,
    activeOrder,
    hoveredStopId,
  ]);

  const projectedPolylines = useMemo(() => {
    if (!connectRoute) return [];
    // Only connect stops that the user has explicitly drafted into the course
    const draftedStops = projectedStops.filter((p) => p.stop.isDraft);
    const candidateToConnect =
      draftedStops.length >= 2
        ? draftedStops
        : projectedStops.every((p) => p.stop.isDraft) &&
            projectedStops.length >= 2
          ? projectedStops
          : [];

    if (candidateToConnect.length < 2) return [];

    const segs: {
      key: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      midX: number;
      midY: number;
      pixelLen: number;
      minutes: number;
      distanceLabel: string;
    }[] = [];

    for (let i = 0; i < candidateToConnect.length - 1; i++) {
      const a = candidateToConnect[i];
      const b = candidateToConnect[i + 1];
      const walk = estimateWalkingRoute(
        a.stop.latitude,
        a.stop.longitude,
        b.stop.latitude,
        b.stop.longitude,
      );
      const pixelLen = Math.hypot(b.x - a.x, b.y - a.y);
      segs.push({
        key: `${a.stop.id}-${b.stop.id}-${i}`,
        x1: a.x,
        y1: a.y,
        x2: b.x,
        y2: b.y,
        midX: (a.x + b.x) / 2,
        midY: (a.y + b.y) / 2,
        pixelLen,
        minutes: walk.walkingMinutes,
        distanceLabel: formatDistanceKo(walk.walkingMeters),
      });
    }
    return segs;
  }, [connectRoute, projectedStops]);

  const projectedStations = useMemo(() => {
    if (!showSubwayLayer) return [];
    return surrounding.stations.map((st) => {
      const px = latLngToContainerPx(
        st.latitude,
        st.longitude,
        viewport,
        containerSize.width,
        containerSize.height,
      );
      return { station: st, x: px.x, y: px.y };
    });
  }, [
    showSubwayLayer,
    surrounding.stations,
    viewport,
    containerSize.width,
    containerSize.height,
  ]);

  const projectedPois = useMemo(() => {
    const items: SurroundingPoi[] = [
      ...(showLandmarkLayer ? surrounding.landmarks : []),
      ...(showParkingLayer ? surrounding.parkings : []),
    ];
    return items.map((poi) => {
      const px = latLngToContainerPx(
        poi.latitude,
        poi.longitude,
        viewport,
        containerSize.width,
        containerSize.height,
      );
      return { poi, x: px.x, y: px.y };
    });
  }, [
    showLandmarkLayer,
    showParkingLayer,
    surrounding.landmarks,
    surrounding.parkings,
    viewport,
    containerSize.width,
    containerSize.height,
  ]);

  const stationToFirstStopGuide = useMemo(() => {
    if (selectedContext?.type !== "STATION" || stops.length === 0) return null;
    const st = selectedContext.station;
    const first = stops[0];
    const walk = estimateWalkingRoute(
      st.latitude,
      st.longitude,
      first.latitude,
      first.longitude,
    );
    const stPx = latLngToContainerPx(
      st.latitude,
      st.longitude,
      viewport,
      containerSize.width,
      containerSize.height,
    );
    const firstPx = latLngToContainerPx(
      first.latitude,
      first.longitude,
      viewport,
      containerSize.width,
      containerSize.height,
    );
    return {
      station: st,
      firstStop: first,
      walkMinutes: walk.walkingMinutes,
      distanceLabel: formatDistanceKo(walk.walkingMeters),
      x1: stPx.x,
      y1: stPx.y,
      x2: firstPx.x,
      y2: firstPx.y,
    };
  }, [
    selectedContext,
    stops,
    viewport,
    containerSize.width,
    containerSize.height,
  ]);

  const currentZoom = activeCenter.zoom;
  const scaleBar = useMemo(
    () => computeMetricScaleBar(activeCenter.lat, currentZoom),
    [activeCenter.lat, currentZoom],
  );

  function handleZoomDelta(delta: 1 | -1) {
    if (mapMode === "google" && mapInstanceRef.current) {
      const cur = mapInstanceRef.current.getZoom() ?? 15;
      const next = clampZoom(cur + delta);
      mapInstanceRef.current.setZoom(next);
      setGoogleView((prev) => ({ ...prev, zoom: next }));
      return;
    }
    commitViewport({
      centerLat: viewport.centerLat,
      centerLng: viewport.centerLng,
      zoom: clampZoom(viewport.zoom + delta),
    }, true);
  }

  function handleResetFit() {
    setSelectedContext(null);
    if (mapMode === "google" && mapInstanceRef.current && window.google?.maps) {
      if (stops.length === 0) {
        if (searchAnchor) {
          mapInstanceRef.current.setCenter({
            lat: searchAnchor.latitude,
            lng: searchAnchor.longitude,
          });
          mapInstanceRef.current.setZoom(15);
        }
        return;
      }
      if (stops.length === 1) {
        mapInstanceRef.current.setCenter({
          lat: stops[0].latitude,
          lng: stops[0].longitude,
        });
        mapInstanceRef.current.setZoom(16);
        return;
      }
      const b = new window.google.maps.LatLngBounds();
      stops.forEach((s) => b.extend({ lat: s.latitude, lng: s.longitude }));
      mapInstanceRef.current.fitBounds(b, {
        top: 56,
        right: 56,
        bottom: 88,
        left: 56,
      });
      return;
    }
    setCurrentViewport(defaultAnchorCenter);
  }

  function handleFocusStation(station: SubwayStationPoi) {
    const isAlreadySelected =
      selectedContext?.type === "STATION" &&
      selectedContext.station.id === station.id;
    if (isAlreadySelected) {
      setSelectedContext(null);
      return;
    }
    setShowSubwayLayer(true);
    setSelectedContext({ type: "STATION", station });

    if (mapMode === "google" && mapInstanceRef.current) {
      mapInstanceRef.current.panTo({
        lat: station.latitude,
        lng: station.longitude,
      });
      if ((mapInstanceRef.current.getZoom() ?? 15) < 15) {
        mapInstanceRef.current.setZoom(15);
      }
      return;
    }

    if (stops.length > 0) {
      const distToFirst = calculateStraightMeters(
        station.latitude,
        station.longitude,
        stops[0].latitude,
        stops[0].longitude,
      );
      if (distToFirst <= 2500) {
        const fitted = computeBestFitViewport(
          [
            { latitude: station.latitude, longitude: station.longitude },
            { latitude: stops[0].latitude, longitude: stops[0].longitude },
          ],
          containerSize.width,
          containerSize.height,
          { top: 72, right: 64, bottom: footerNode ? 120 : 88, left: 64 },
        );
        commitViewport(fitted, true);
        return;
      }
    }

    commitViewport({
      centerLat: station.latitude,
      centerLng: station.longitude,
      zoom: 16,
    }, true);
  }

  const effectiveHeightClass = isExpanded
    ? "h-[520px] lg:h-[620px]"
    : heightClassName;

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_12px_36px_rgba(24,24,27,0.05)]">
      {/* 1. Map Header & Theme Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <span
            style={{ backgroundColor: activeTheme.routeStroke }}
            className="h-3 w-3 rounded-full shrink-0"
          />
          <span className="text-sm font-black text-foreground">
            {headerTitle}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-subtle p-1">
            <Palette className="ml-2 mr-1 h-3.5 w-3.5 text-muted" />
            {(Object.keys(DAYT_MAP_THEMES) as DaytMapThemeId[]).map((key) => {
              const spec = DAYT_MAP_THEMES[key];
              const selected = themeId === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setThemeId(key)}
                  className={`rounded-full px-3 py-1 text-xs font-extrabold transition-colors ${
                    selected
                      ? "bg-surface-dark text-white"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {spec.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Nearby Subway Quick Chips & Surrounding Layer Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-subtle/55 px-4 py-2.5 sm:px-5 text-xs">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="inline-flex shrink-0 items-center gap-1.5 font-black text-muted">
            <TrainFront className="h-4 w-4 text-primary" />
            <span>주변 역</span>
          </span>

          {visibleClosestStations.length === 0 ? (
            <span className="text-xs font-medium text-muted">
              반경 내 지하철역 없음
            </span>
          ) : (
            visibleClosestStations.map((st) => {
              const walkBaseMinutes =
                stops.length > 0 && !hasMovedFromSearchOrigin
                  ? estimateWalkingRoute(
                      st.latitude,
                      st.longitude,
                      stops[0].latitude,
                      stops[0].longitude,
                    ).walkingMinutes
                  : Math.max(
                      1,
                      Math.round((st.distanceFromCenter * 1.25) / 67),
                    );

              const isSelected =
                selectedContext?.type === "STATION" &&
                selectedContext.station.id === st.id;

              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => handleFocusStation(st)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                    isSelected
                      ? "border-surface-dark bg-surface-dark text-white"
                      : "border-line bg-surface text-foreground hover:border-primary/50"
                  }`}
                >
                  <span className="flex items-center gap-0.5">
                    {st.lines.slice(0, 3).map((line) => (
                      <span
                        key={line.label}
                        style={{ backgroundColor: line.color }}
                        className="h-2.5 w-2.5 rounded-full"
                        title={line.label}
                      />
                    ))}
                  </span>
                  <span>{st.name}</span>
                  <span
                    className={`text-xs font-semibold ${
                      isSelected ? "text-amber-300" : "text-muted"
                    }`}
                  >
                    도보 {walkBaseMinutes}분
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Surrounding Layer Toggles (All 3 active by default) */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowSubwayLayer((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black transition-colors ${
              showSubwayLayer
                ? "bg-slate-800 text-white"
                : "border border-line bg-surface text-muted hover:text-foreground"
            }`}
          >
            <TrainFront className="h-3.5 w-3.5" />
            <span>역</span>
          </button>

          <button
            type="button"
            onClick={() => setShowLandmarkLayer((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black transition-colors ${
              showLandmarkLayer
                ? "bg-emerald-700 text-white"
                : "border border-line bg-surface text-muted hover:text-foreground"
            }`}
          >
            <Trees className="h-3.5 w-3.5" />
            <span>명소·공원</span>
          </button>

          <button
            type="button"
            onClick={() => setShowParkingLayer((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black transition-colors ${
              showParkingLayer
                ? "bg-blue-600 text-white"
                : "border border-line bg-surface text-muted hover:text-foreground"
            }`}
          >
            <SquareParking className="h-3.5 w-3.5" />
            <span>주차장</span>
          </button>
        </div>
      </div>

      {/* 3. Interactive Map Canvas */}
      <div
        style={{ backgroundColor: activeTheme.canvasBg }}
        className={`relative select-none overflow-hidden transition-[height,background-color] duration-200 min-h-[460px] ${effectiveHeightClass}`}
      >
        {mapMode === "google" ? (
          <div ref={mapContainerRef} className="h-full w-full" />
        ) : (
          <div
            ref={tileContainerRef}
            suppressHydrationWarning
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onDoubleClick={(e) => {
              if ((e.target as HTMLElement).closest("button, a")) return;
              handleZoomDelta(1);
            }}
            className={`relative h-full w-full touch-none overflow-hidden ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
          >
            {/* Real Korean Street & Transit Raster Tiles */}
            <div
              style={{ filter: activeTheme.tileCssFilter }}
              className="pointer-events-none absolute inset-0"
              aria-hidden="true"
            >
              {visibleTiles.map((tile) => (
                <div
                  key={tile.key}
                  style={{
                    left: `${tile.left}px`,
                    top: `${tile.top}px`,
                    width: "256px",
                    height: "256px",
                    backgroundImage: `url("${tile.url}")`,
                    backgroundSize: "256px 256px",
                  }}
                  className="absolute"
                />
              ))}
            </div>

            {/* Subtle Mood Editorial Tint */}
            <div
              style={{ backgroundColor: activeTheme.tileOverlayTint }}
              className="pointer-events-none absolute inset-0"
              aria-hidden="true"
            />

            {/* Route Polyline & Subway Walking Guide SVG Layer */}
            <svg
              width={containerSize.width}
              height={containerSize.height}
              viewBox={`0 0 ${containerSize.width} ${containerSize.height}`}
              className="pointer-events-none absolute inset-0 z-10 h-full w-full"
              aria-hidden="true"
            >
              <defs>
                <marker
                  id="dayt-tile-route-arrow"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path
                    d="M 0 1 L 10 5 L 0 9 z"
                    fill={activeTheme.routeStroke}
                  />
                </marker>
              </defs>

              {stationToFirstStopGuide && (
                <g>
                  <line
                    x1={stationToFirstStopGuide.x1}
                    y1={stationToFirstStopGuide.y1}
                    x2={stationToFirstStopGuide.x2}
                    y2={stationToFirstStopGuide.y2}
                    stroke="#FFFFFF"
                    strokeWidth="5"
                    strokeLinecap="round"
                    opacity="0.75"
                  />
                  <line
                    x1={stationToFirstStopGuide.x1}
                    y1={stationToFirstStopGuide.y1}
                    x2={stationToFirstStopGuide.x2}
                    y2={stationToFirstStopGuide.y2}
                    stroke="#0F172A"
                    strokeWidth="2.5"
                    strokeDasharray="6 5"
                    strokeLinecap="round"
                  />
                </g>
              )}

              {projectedPolylines.map((seg) => (
                <g key={seg.key}>
                  <line
                    x1={seg.x1}
                    y1={seg.y1}
                    x2={seg.x2}
                    y2={seg.y2}
                    stroke="#FFFFFF"
                    strokeWidth="6.5"
                    strokeLinecap="round"
                    opacity="0.82"
                  />
                  <line
                    x1={seg.x1}
                    y1={seg.y1}
                    x2={seg.x2}
                    y2={seg.y2}
                    stroke={activeTheme.routeStroke}
                    strokeWidth="3.5"
                    strokeDasharray="8 5"
                    strokeLinecap="round"
                    markerEnd="url(#dayt-tile-route-arrow)"
                  />
                </g>
              ))}
            </svg>

            {/* Walking Segment Minute Badges */}
            {projectedPolylines.map((seg) =>
              seg.pixelLen >= 68 ? (
                <div
                  key={`badge-${seg.key}`}
                  suppressHydrationWarning
                  style={{
                    left: `${Math.round(seg.midX)}px`,
                    top: `${Math.round(seg.midY)}px`,
                  }}
                  className="pointer-events-none absolute z-[16] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/30 bg-surface/95 px-2 py-0.5 text-[10px] font-extrabold whitespace-nowrap text-primary shadow-xs"
                >
                  도보 {seg.minutes}분 · {seg.distanceLabel}
                </div>
              ) : null,
            )}

            {/* Surrounding Landmarks, Parks & Parking Pins (Pure SVG Icons) */}
            {projectedPois.map(({ poi, x, y }) => {
              if (
                x < -70 ||
                x > containerSize.width + 70 ||
                y < -40 ||
                y > containerSize.height + 40
              ) {
                return null;
              }
              const isParking = poi.kind === "PARKING";
              const isPark = poi.kind === "PARK";
              const isSelected =
                selectedContext?.type === "POI" &&
                selectedContext.poi.id === poi.id;

              return (
                <button
                  key={poi.id}
                  type="button"
                  suppressHydrationWarning
                  onClick={() =>
                    setSelectedContext(
                      isSelected ? null : { type: "POI", poi },
                    )
                  }
                  style={{
                    left: `${Math.round(x)}px`,
                    top: `${Math.round(y)}px`,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold whitespace-nowrap shadow-xs transition-transform hover:scale-105 ${
                    isSelected
                      ? "z-30 border-amber-300 bg-surface-dark text-white"
                      : isParking
                        ? "z-[12] border-blue-200 bg-blue-50/95 text-blue-700"
                        : isPark
                          ? "z-[12] border-emerald-200 bg-emerald-50/95 text-emerald-800"
                          : "z-[12] border-teal-200 bg-teal-50/95 text-teal-800"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-white ${
                      isParking
                        ? "bg-blue-600"
                        : isPark
                          ? "bg-emerald-600"
                          : "bg-teal-600"
                    }`}
                  >
                    {isParking ? (
                      <SquareParking className="h-2.5 w-2.5" />
                    ) : isPark ? (
                      <Trees className="h-2.5 w-2.5" />
                    ) : (
                      <Landmark className="h-2.5 w-2.5" />
                    )}
                  </span>
                  <span className="max-w-24 truncate">{poi.name}</span>
                </button>
              );
            })}

            {/* Nearby Subway Station Pins (Pure SVG Icon) */}
            {projectedStations.map(({ station, x, y }) => {
              if (
                x < -80 ||
                x > containerSize.width + 80 ||
                y < -40 ||
                y > containerSize.height + 40
              ) {
                return null;
              }
              const isSelected =
                selectedContext?.type === "STATION" &&
                selectedContext.station.id === station.id;
              const primaryLineColor = station.lines[0]?.color ?? "#0EA5E9";

              return (
                <button
                  key={station.id}
                  type="button"
                  suppressHydrationWarning
                  onClick={() => handleFocusStation(station)}
                  style={{
                    left: `${Math.round(x)}px`,
                    top: `${Math.round(y)}px`,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-extrabold whitespace-nowrap shadow-md transition-transform hover:scale-105 ${
                    isSelected
                      ? "z-30 border-amber-300 bg-slate-900 text-white ring-2 ring-amber-300"
                      : "z-[15] border-slate-700/80 bg-slate-900/92 text-white"
                  }`}
                >
                  <span
                    style={{ backgroundColor: primaryLineColor }}
                    className="flex h-4 w-4 items-center justify-center rounded-full text-white"
                  >
                    <TrainFront className="h-2.5 w-2.5" />
                  </span>
                  <span>{station.name}</span>
                  {station.lines.length > 0 && (
                    <span className="rounded bg-white/15 px-1 py-0.5 text-[9px] font-bold text-white/90">
                      {station.lines[0].label}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Numbered Date Spot Markers with Category SVG Icons */}
            {projectedStops.map((pin) => {
              if (
                pin.x < -80 ||
                pin.x > containerSize.width + 80 ||
                pin.y < -40 ||
                pin.y > containerSize.height + 40
              ) {
                return null;
              }

              const visual = getStopCategoryVisual(
                pin.stop.categoryGroup,
                pin.stop.categoryLabel,
              );
              const CategoryIcon = visual.icon;

              return (
                <button
                  key={`${pin.stop.id}-${pin.stop.order}`}
                  type="button"
                  suppressHydrationWarning
                  onMouseEnter={() => setHoveredStopId(pin.stop.id)}
                  onMouseLeave={() =>
                    setHoveredStopId((cur) =>
                      cur === pin.stop.id ? null : cur,
                    )
                  }
                  onClick={() => {
                    setSelectedContext(null);
                    setSelectedStopId(pin.stop.id);
                    onSelectStop?.(pin.stop);
                  }}
                  title={`${pin.stop.order}. ${pin.stop.name} (${pin.stop.categoryLabel})`}
                  style={{
                    left: `${Math.round(pin.x)}px`,
                    top: `${Math.round(pin.y)}px`,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center rounded-full font-extrabold whitespace-nowrap shadow-md transition-transform hover:scale-105 ${
                    pin.showFullLabel
                      ? "gap-1.5 px-2.5 py-1 text-[11px]"
                      : "p-0.5 text-[11px]"
                  } ${
                    pin.isFocused
                      ? "z-30 bg-surface-dark text-white ring-2 ring-amber-300"
                      : pin.stop.isDraft
                        ? "z-25 bg-surface text-foreground ring-2 ring-primary shadow-primary/30"
                        : "z-20 bg-surface text-foreground ring-1.5 ring-line"
                  }`}
                >
                  <span
                    style={{ backgroundColor: visual.color }}
                    className={`flex items-center justify-center rounded-full text-white shadow-2xs ${
                      pin.showFullLabel ? "h-4.5 w-4.5" : "h-6 w-6"
                    }`}
                  >
                    <CategoryIcon
                      className={
                        pin.showFullLabel ? "h-2.5 w-2.5" : "h-3.5 w-3.5"
                      }
                    />
                  </span>
                  {pin.showFullLabel && (
                    <span className="max-w-28 truncate">{pin.stop.name}</span>
                  )}
                  {pin.stop.isDraft && (
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-black text-white -ml-0.5">
                      {pin.stop.order}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Empty State Banner */}
            {stops.length === 0 && !onSearchInArea && (
              <div className="pointer-events-none absolute inset-x-6 top-12 z-20 flex items-center justify-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/95 px-4 py-2 text-xs font-extrabold text-foreground shadow-sm backdrop-blur-xs">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>경유지를 추가하면 번호 마커와 도보 동선이 연결됩니다</span>
                </div>
              </div>
            )}

            {/* OpenStreetMap Attribution */}
            <div className="pointer-events-none absolute right-2.5 bottom-1.5 z-[15] rounded bg-surface/75 px-1.5 py-0.5 text-[9px] font-medium text-muted">
              © OpenStreetMap
            </div>
          </div>
        )}

        {/* 3.5 Re-Search Date Spots in Moved Map Area Button (Top-Center) */}
        {onSearchInArea && (hasMovedFromSearchOrigin || isSearchingArea) && (
          <div className="pointer-events-none absolute inset-x-12 top-3 z-30 flex justify-center">
            <button
              type="button"
              disabled={isSearchingArea}
              onClick={() =>
                onSearchInArea({
                  latitude: activeCenter.lat,
                  longitude: activeCenter.lng,
                  areaHint: inferredAreaHint,
                })
              }
              className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-primary/30 bg-surface-dark/95 px-5 py-2.5 text-xs sm:text-sm font-black text-white shadow-xl backdrop-blur-md transition-transform hover:scale-[1.02] hover:bg-primary disabled:opacity-70"
            >
              {isSearchingArea ? (
                <Loader2 className="h-4 w-4 animate-spin text-amber-300" />
              ) : (
                <RotateCw className="h-4 w-4 text-amber-300" />
              )}
              <span>
                {isSearchingArea
                  ? "선택 조건으로 탐색 중..."
                  : "이 지역에서 다시 탐색"}
              </span>
            </button>
          </div>
        )}

        {/* 4. Floating Zoom / Fit / Expand Controls (Top-Right) */}
        <div className="absolute top-3 right-3 z-30 flex flex-col gap-2">
          <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface/95 shadow-md backdrop-blur-md">
            <button
              type="button"
              onClick={() => handleZoomDelta(1)}
              disabled={currentZoom >= MAX_MAP_ZOOM}
              title="지도 확대 (+)"
              aria-label="지도 확대"
              className="flex h-9 w-9 items-center justify-center text-foreground transition-colors hover:bg-primary-soft hover:text-primary disabled:opacity-35"
            >
              <Plus className="h-4.5 w-4.5" />
            </button>
            <div className="border-y border-line py-1 text-center font-mono text-[10px] font-extrabold text-muted">
              Z{currentZoom}
            </div>
            <button
              type="button"
              onClick={() => handleZoomDelta(-1)}
              disabled={currentZoom <= MIN_MAP_ZOOM}
              title="지도 축소 (-)"
              aria-label="지도 축소"
              className="flex h-9 w-9 items-center justify-center text-foreground transition-colors hover:bg-primary-soft hover:text-primary disabled:opacity-35"
            >
              <Minus className="h-4.5 w-4.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetFit}
            title="전체 스팟 한눈에 맞추기"
            aria-label="전체 스팟 한눈에 맞추기"
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-line bg-surface/95 text-foreground shadow-md backdrop-blur-md transition-colors hover:bg-primary-soft hover:text-primary"
          >
            <LocateFixed className="h-4.5 w-4.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            title={isExpanded ? "기본 크기로 줄이기" : "지도 크게 보기"}
            aria-label={isExpanded ? "기본 크기로 줄이기" : "지도 크게 보기"}
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-line bg-surface/95 text-foreground shadow-md backdrop-blur-md transition-colors hover:bg-primary-soft hover:text-primary"
          >
            {isExpanded ? (
              <Minimize2 className="h-4.5 w-4.5" />
            ) : (
              <Maximize2 className="h-4.5 w-4.5" />
            )}
          </button>
        </div>

        {/* 5. Real Metric Scale Bar (Top-Left) */}
        <div className="pointer-events-none absolute top-3 left-3 z-20 flex items-center gap-2 rounded-full border border-line/80 bg-surface/90 px-3 py-1 text-xs font-extrabold text-foreground shadow-xs backdrop-blur-xs">
          <span>{scaleBar.label}</span>
          <span
            style={{ width: `${scaleBar.widthPx}px` }}
            className="block h-1.5 border-x-2 border-b-2 border-foreground/80"
          />
        </div>

        {/* 6. Selected Subway Station / Landmark / Parking Context Info Card (Pure SVG Icons) */}
        {selectedContext && (
          <div
            className={`absolute inset-x-4 z-30 flex items-center justify-between gap-3 rounded-2xl border border-slate-700/20 bg-slate-900/95 px-4 py-2.5 text-white shadow-lg backdrop-blur-md ${
              footerNode ? "bottom-18" : "bottom-4"
            }`}
          >
            {selectedContext.type === "STATION" ? (
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold">
                    <TrainFront className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                    <span>{selectedContext.station.name}</span>
                  </span>
                  {selectedContext.station.lines.map((line) => (
                    <span
                      key={line.label}
                      style={{ backgroundColor: line.color }}
                      className="rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white"
                    >
                      {line.label}
                    </span>
                  ))}
                </div>
                <p className="mt-0.5 truncate text-[11px] text-slate-300">
                  {stationToFirstStopGuide
                    ? `1번 '${stationToFirstStopGuide.firstStop.name}'까지 도보 약 ${stationToFirstStopGuide.walkMinutes}분 (${stationToFirstStopGuide.distanceLabel})`
                    : `현 지도 중심에서 약 ${selectedContext.station.distanceMeters}m`}
                </p>
              </div>
            ) : (
              <div className="min-w-0">
                <p
                  className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold ${
                    selectedContext.poi.kind === "PARKING"
                      ? "text-sky-300"
                      : "text-emerald-300"
                  }`}
                >
                  {selectedContext.poi.kind === "PARKING" ? (
                    <SquareParking className="h-3.5 w-3.5 shrink-0" />
                  ) : selectedContext.poi.kind === "PARK" ? (
                    <Trees className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <Landmark className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span>
                    {selectedContext.poi.kind === "PARKING"
                      ? "주변 주차장"
                      : `주변 ${selectedContext.poi.categoryLabel}`}
                  </span>
                </p>
                <p className="mt-0.5 truncate text-xs font-extrabold text-white">
                  {selectedContext.poi.name}
                </p>
              </div>
            )}

            <div className="flex shrink-0 items-center gap-1.5">
              {(selectedContext.type === "STATION"
                ? selectedContext.station.placeUrl
                : selectedContext.poi.placeUrl) && (
                <a
                  href={
                    (selectedContext.type === "STATION"
                      ? selectedContext.station.placeUrl
                      : selectedContext.poi.placeUrl) ?? "#"
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-white/25"
                >
                  <span>지도</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setSelectedContext(null)}
                aria-label="주변 정보 닫기"
                className="rounded-full p-1 text-slate-300 hover:bg-white/15 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* 7. Selected Spot Floating Info Pill */}
        {activeStop && !footerNode && !selectedContext && (
          <div className="absolute inset-x-4 bottom-4 z-30 flex items-center justify-between gap-3 rounded-2xl border border-white/70 bg-surface/95 px-4 py-3 shadow-sm backdrop-blur-md">
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold text-primary">
                #{activeStop.order} {activeStop.categoryLabel}
                {typeof activeStop.stayMinutes === "number"
                  ? ` · ${activeStop.stayMinutes}분 체류`
                  : ""}
              </p>
              <p className="truncate text-xs font-extrabold text-foreground">
                {activeStop.name}
              </p>
              <p className="truncate text-[11px] text-muted">
                {activeStop.address}
              </p>
            </div>
            {activeStop.placeUrl && (
              <a
                href={activeStop.placeUrl}
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

        {/* 8. Custom Footer Overlay */}
        {footerNode && (
          <div className="absolute inset-x-4 bottom-3 z-30 rounded-2xl border border-white/60 bg-surface/94 p-3 shadow-sm backdrop-blur-md">
            {footerNode}
          </div>
        )}
      </div>
    </div>
  );
}
