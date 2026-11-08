const EARTH_RADIUS_METERS = 6_371_000;
const URBAN_DETOUR_FACTOR = 1.25;
const WALKING_METERS_PER_MINUTE = 67;

export function calculateStraightMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) *
      Math.cos(rLat2) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

export function estimateWalkingRoute(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): { walkingMeters: number; walkingMinutes: number } {
  const straight = calculateStraightMeters(lat1, lng1, lat2, lng2);
  if (straight < 15) {
    return { walkingMeters: Math.round(straight), walkingMinutes: 1 };
  }
  const walkingMeters = Math.round(straight * URBAN_DETOUR_FACTOR);
  const walkingMinutes = Math.max(
    1,
    Math.round(walkingMeters / WALKING_METERS_PER_MINUTE),
  );
  return { walkingMeters, walkingMinutes };
}

export function estimateDrivingRoute(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): { drivingMeters: number; drivingMinutes: number } {
  const straight = calculateStraightMeters(lat1, lng1, lat2, lng2);
  if (straight < 50) {
    return { drivingMeters: Math.round(straight), drivingMinutes: 1 };
  }
  const drivingMeters = Math.round(straight * 1.35);
  // 도심 평균 속도 약 27km/h(분당 450m) + 기본 신호대기/정차 2분
  const drivingMinutes = Math.max(2, Math.round(drivingMeters / 450) + 2);
  return { drivingMeters, drivingMinutes };
}

export function formatDistanceKo(meters: number): string {
  if (meters < 1000) {
    return `약 ${Math.round(meters)}m`;
  }
  return `약 ${(meters / 1000).toFixed(1)}km`;
}

export function formatDurationKo(totalMinutes: number): string {
  const safe = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  if (hours === 0) {
    return `${mins}분`;
  }
  if (mins === 0) {
    return `${hours}시간`;
  }
  return `${hours}시간 ${mins}분`;
}

export function clockToMinutes(clock: string): number {
  const [hStr, mStr] = clock.split(":");
  const hours = Number(hStr);
  const mins = Number(mStr);
  return (
    (Number.isFinite(hours) ? hours : 0) * 60 +
    (Number.isFinite(mins) ? mins : 0)
  );
}

export function diffMinutesBetweenClocks(
  fromClock: string,
  toClock: string,
): number {
  const from = clockToMinutes(fromClock);
  const to = clockToMinutes(toClock);
  let diff = to - from;
  if (diff < 0) {
    diff += 1440;
  }
  return diff;
}

export function addMinutesToClock(
  startClock: string,
  offsetMinutes: number,
): string {
  const [hStr, mStr] = startClock.split(":");
  const baseHours = Number(hStr);
  const baseMins = Number(mStr);
  const startTotal =
    (Number.isFinite(baseHours) ? baseHours : 13) * 60 +
    (Number.isFinite(baseMins) ? baseMins : 0);
  const target = (((startTotal + offsetMinutes) % 1440) + 1440) % 1440;
  const hh = String(Math.floor(target / 60)).padStart(2, "0");
  const mm = String(target % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

