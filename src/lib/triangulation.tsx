import { DeviceReading } from "@/types";

const R = 6371000; // meters

export const toRad = (deg: number) => (deg * Math.PI) / 180;
export const toDeg = (rad: number) => (rad * 180) / Math.PI;

export type XY = { x: number; y: number };
export type LatLng = { lat: number; lng: number };

export function getRef(readings: Pick<DeviceReading, "lat" | "lng">[]) {
  if (readings.length === 0) return { refLat: 0, refLng: 0 };
  const refLat = readings.reduce((a, r) => a + r.lat, 0) / readings.length;
  const refLng = readings.reduce((a, r) => a + r.lng, 0) / readings.length;
  return { refLat, refLng };
}

export function project(lat: number, lng: number, refLat: number, refLng: number): XY {
  const x = R * (toRad(lng - refLng)) * Math.cos(toRad(refLat));
  const y = R * toRad(lat - refLat);
  return { x, y };
}

export function unproject(x: number, y: number, refLat: number, refLng: number): LatLng {
  const lat = refLat + toDeg(y / R);
  const lng = refLng + toDeg(x / (R * Math.cos(toRad(refLat))));
  return { lat, lng };
}

export function directionUnitVec(directionDeg: number): XY {
  const t = toRad(directionDeg);
  return { x: Math.sin(t), y: Math.cos(t) }; // 0° = North (positive y)
}

/**
 * Intersect two **rays** (p1 + t*v1, t>=0) and (p2 + s*v2, s>=0).
 * Returns XY point if intersection exists forward along both rays, else null.
 */
export function intersectTwoRays(p1: XY, v1: XY, p2: XY, v2: XY): XY | null {
  const dx = { x: p2.x - p1.x, y: p2.y - p1.y };
  const det = v1.x * (-v2.y) - v1.y * (-v2.x); // = v2.x*v1.y - v1.x*v2.y
  if (Math.abs(det) < 1e-9) return null; // parallel

  // Solve [v1 | -v2] [t s]^T = dx
  const t = (dx.x * (-v2.y) - dx.y * (-v2.x)) / det;
  const s = (v1.x * dx.y - v1.y * dx.x) / det;
  if (t >= 0 && s >= 0) {
    return { x: p1.x + t * v1.x, y: p1.y + t * v1.y };
  }
  return null;
}

/** Least-squares intersection of N (>=2) infinite lines defined by points + directions. */
export function leastSquaresIntersection(points: XY[], dirs: XY[]): XY | null {
  let Sxx = 0, Sxy = 0, Syy = 0;
  let bx = 0, by = 0;
  for (let i = 0; i < points.length; i++) {
    const v = dirs[i];
    // normal to v
    const n = { x: -v.y, y: v.x };
    const nnxx = n.x * n.x;
    const nnxy = n.x * n.y;
    const nnyy = n.y * n.y;
    Sxx += nnxx; Sxy += nnxy; Syy += nnyy;
    const dot = n.x * points[i].x + n.y * points[i].y;
    bx += n.x * dot;
    by += n.y * dot;
  }
  const det = Sxx * Syy - Sxy * Sxy;
  if (Math.abs(det) < 1e-9) return null;
  const inv00 =  Syy / det;
  const inv01 = -Sxy / det;
  const inv11 =  Sxx / det;
  return {
    x: inv00 * bx + inv01 * by,
    y: inv01 * bx + inv11 * by,
  };
}

export function estimateSource(readings: DeviceReading[]): { lat: number; lng: number; method: "two-ray" | "least-squares" } | null {
  if (readings.length < 2) return null;
  const { refLat, refLng } = getRef(readings);
  const pts = readings.map(r => project(r.lat, r.lng, refLat, refLng));
  const dirs = readings.map(r => directionUnitVec(r.directionDeg));

  // Try exact 2-ray intersection if exactly 2 readings
  if (readings.length === 2) {
    const p = intersectTwoRays(pts[0], dirs[0], pts[1], dirs[1]);
    if (p) {
      const ll = unproject(p.x, p.y, refLat, refLng);
      return { ...ll, method: "two-ray" };
    }
  }

  // Fallback / general case: least-squares over infinite lines
  const ls = leastSquaresIntersection(pts, dirs);
  if (!ls) return null;
  const ll = unproject(ls.x, ls.y, refLat, refLng);
  return { ...ll, method: "least-squares" };
}

export function rayEndpoint(origin: LatLng, directionDeg: number, lengthMeters: number, refLat: number, refLng: number): LatLng {
  const v = directionUnitVec(directionDeg);
  const p0 = project(origin.lat, origin.lng, refLat, refLng);
  const p1 = { x: p0.x + v.x * lengthMeters, y: p0.y + v.y * lengthMeters };
  return unproject(p1.x, p1.y, refLat, refLng);
}