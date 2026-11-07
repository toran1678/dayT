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
  setZoom: (zoom: number) => void;
  panTo: (center: GoogleLatLngLiteral) => void;
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
    stylers: [{ color: "#57534e" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#e5efe2" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#efeae0" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#dce9f2" }],
  },
];

