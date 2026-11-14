export interface GoogleLatLngLiteral {
  lat: number;
  lng: number;
}

export interface GoogleMapStyleElement {
  featureType?: string;
  elementType?: string;
  stylers: Record<string, string | number>[];
}

export interface GoogleLatLngBoundsInstance {
  extend: (point: GoogleLatLngLiteral) => void;
}

export interface GoogleMapInstance {
  setCenter: (center: GoogleLatLngLiteral) => void;
  getCenter?: () => { lat: () => number; lng: () => number } | undefined;
  getBounds?: () =>
    | {
        getSouthWest: () => { lat: () => number; lng: () => number };
        getNorthEast: () => { lat: () => number; lng: () => number };
      }
    | undefined;
  setZoom: (zoom: number) => void;
  getZoom: () => number | undefined;
  panTo: (center: GoogleLatLngLiteral) => void;
  setOptions: (options: { styles?: GoogleMapStyleElement[] }) => void;
  addListener: (eventName: string, handler: () => void) => { remove: () => void };
  fitBounds: (
    bounds: GoogleLatLngBoundsInstance,
    padding?:
      | number
      | { top: number; right: number; bottom: number; left: number },
  ) => void;
}

export interface GoogleMarkerInstance {
  setMap: (map: GoogleMapInstance | null) => void;
  addListener: (eventName: string, handler: () => void) => { remove: () => void };
}

export interface GooglePolylineInstance {
  setMap: (map: GoogleMapInstance | null) => void;
}

export interface GoogleTransitLayerInstance {
  setMap: (map: GoogleMapInstance | null) => void;
}

export interface GoogleInfoWindowInstance {
  setContent: (htmlOrNode: string | HTMLElement) => void;
  open: (options: { map: GoogleMapInstance; anchor: GoogleMarkerInstance }) => void;
  close: () => void;
}

export interface GoogleMapsNamespace {
  Map: new (
    container: HTMLElement,
    options: {
      center: GoogleLatLngLiteral;
      zoom: number;
      disableDefaultUI?: boolean;
      zoomControl?: boolean;
      scaleControl?: boolean;
      clickableIcons?: boolean;
      gestureHandling?: string;
      styles?: GoogleMapStyleElement[];
    },
  ) => GoogleMapInstance;
  Marker: new (options: {
    position: GoogleLatLngLiteral;
    map: GoogleMapInstance;
    title?: string;
    zIndex?: number;
    icon?: {
      url: string;
      scaledSize?: unknown;
      anchor?: unknown;
    };
  }) => GoogleMarkerInstance;
  Polyline: new (options: {
    path: GoogleLatLngLiteral[];
    geodesic?: boolean;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeWeight?: number;
    icons?: {
      icon: {
        path: unknown;
        scale?: number;
        strokeColor?: string;
        fillColor?: string;
        fillOpacity?: number;
      };
      offset?: string;
      repeat?: string;
    }[];
    map?: GoogleMapInstance;
  }) => GooglePolylineInstance;
  TransitLayer: new () => GoogleTransitLayerInstance;
  InfoWindow: new () => GoogleInfoWindowInstance;
  LatLngBounds: new () => GoogleLatLngBoundsInstance;
  Size: new (width: number, height: number) => unknown;
  Point: new (x: number, y: number) => unknown;
  SymbolPath: {
    FORWARD_CLOSED_ARROW: unknown;
  };
}

declare global {
  interface Window {
    google?: {
      maps?: GoogleMapsNamespace;
    };
    gm_authFailure?: () => void;
  }
}

export function getConfiguredGoogleMapsApiKey(): string | null {
  const raw = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (!raw || raw.startsWith("your_") || raw === "CHANGE_ME") {
    return null;
  }
  return raw;
}

let loaderPromise: Promise<GoogleMapsNamespace> | null = null;
const authFailureListeners = new Set<() => void>();

export function subscribeGoogleMapsAuthFailure(listener: () => void): () => void {
  authFailureListeners.add(listener);
  return () => {
    authFailureListeners.delete(listener);
  };
}

export function loadGoogleMapsApi(apiKey: string): Promise<GoogleMapsNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Browser environment required"));
  }
  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }
  if (loaderPromise) {
    return loaderPromise;
  }

  window.gm_authFailure = () => {
    authFailureListeners.forEach((cb) => cb());
  };

  loaderPromise = new Promise<GoogleMapsNamespace>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-dayt-google-maps="true"]',
    );
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.google?.maps) {
          resolve(window.google.maps);
        } else {
          reject(new Error("Google Maps namespace unavailable"));
        }
      });
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Google Maps script")),
      );
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&language=ko&region=KR`;
    script.async = true;
    script.defer = true;
    script.dataset.daytGoogleMaps = "true";
    script.onload = () => {
      if (window.google?.maps) {
        resolve(window.google.maps);
      } else {
        loaderPromise = null;
        reject(new Error("Google Maps namespace unavailable after script load"));
      }
    };
    script.onerror = () => {
      loaderPromise = null;
      reject(new Error("Google Maps JS API script load error"));
    };
    document.head.appendChild(script);
  });

  return loaderPromise;
}

export const DAYT_WARM_MAP_STYLES: GoogleMapStyleElement[] = [
  {
    elementType: "geometry",
    stylers: [{ color: "#f6f3ec" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#44403c" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#dfeee0" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#0f766e" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#ebe4d8" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#cfe4f2" }],
  },
];

export const DAYT_SUNSET_MAP_STYLES: GoogleMapStyleElement[] = [
  {
    elementType: "geometry",
    stylers: [{ color: "#fff1eb" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#7c2d12" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#fffaf5" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#fde2e4" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#be123c" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#fed7aa" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#fecdd3" }],
  },
];

export const DAYT_NIGHT_MAP_STYLES: GoogleMapStyleElement[] = [
  {
    elementType: "geometry",
    stylers: [{ color: "#1c1917" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#e7e5e4" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#1c1917" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#1f2922" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#38bdf8" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#292524" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#44403c" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0f172a" }],
  },
];

export type DaytMapThemeId = "WARM" | "SUNSET" | "NIGHT";

export interface DaytMapThemeSpec {
  id: DaytMapThemeId;
  label: string;
  canvasBg: string;
  roadPrimary: string;
  roadSecondary: string;
  routeStroke: string;
  isDark: boolean;
  tileCssFilter: string;
  tileOverlayTint: string;
  googleStyles: GoogleMapStyleElement[];
}

export const DAYT_MAP_THEMES: Record<DaytMapThemeId, DaytMapThemeSpec> = {
  WARM: {
    id: "WARM",
    label: "웜 에디토리얼",
    canvasBg: "#EDE8DF",
    roadPrimary: "#E7E2D8",
    roadSecondary: "#EAE5DC",
    routeStroke: "#E85D3F",
    isDark: false,
    tileCssFilter: "sepia(0.15) saturate(0.88) brightness(1.02) contrast(0.97)",
    tileOverlayTint: "rgba(244, 239, 228, 0.13)",
    googleStyles: DAYT_WARM_MAP_STYLES,
  },
  SUNSET: {
    id: "SUNSET",
    label: "로맨틱 선셋",
    canvasBg: "#FBE8E0",
    roadPrimary: "#FED7AA",
    roadSecondary: "#FECDD3",
    routeStroke: "#E11D48",
    isDark: false,
    tileCssFilter:
      "sepia(0.24) hue-rotate(-14deg) saturate(1.06) brightness(1.01) contrast(0.97)",
    tileOverlayTint: "rgba(255, 232, 224, 0.16)",
    googleStyles: DAYT_SUNSET_MAP_STYLES,
  },
  NIGHT: {
    id: "NIGHT",
    label: "미드나잇 야경",
    canvasBg: "#18181B",
    roadPrimary: "#292524",
    roadSecondary: "#44403C",
    routeStroke: "#FBBF24",
    isDark: true,
    tileCssFilter:
      "invert(0.91) hue-rotate(180deg) saturate(0.82) brightness(0.95) contrast(1.08)",
    tileOverlayTint: "rgba(15, 23, 42, 0.18)",
    googleStyles: DAYT_NIGHT_MAP_STYLES,
  },
};
