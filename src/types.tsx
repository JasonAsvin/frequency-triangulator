export type DeviceReading = {
readingId: string; // unique per entry (generated on add)
id: string; // device id / name
lat: number;
lng: number;
directionDeg: number; // 0=N, 90=E, 180=S, 270=W
strength?: number; // optional (meters)
timestamp: number; // epoch ms
};