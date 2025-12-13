"use client";
import { MapContainer, TileLayer, Polyline, CircleMarker, Circle, useMap, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import type { LatLngExpression, LatLngBoundsExpression } from "leaflet";
import { useReadingsStore } from "@/store/useReadingsStore";
import { estimateSource, getRef, rayEndpoint } from "@/lib/triangulation";
import React from "react";

const RAY_LENGTH_M = 10_000; // meters (10 km)

function AutoFitBounds() {
  const { readings } = useReadingsStore();
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    if (readings.length === 0) return;
    const { refLat, refLng } = getRef(readings);
    const pts: LatLngExpression[] = readings.map((r) => [r.lat, r.lng]);
    const ends: LatLngExpression[] = readings.map((r) => {
      const end = rayEndpoint(
        { lat: r.lat, lng: r.lng },
        r.directionDeg,
        RAY_LENGTH_M,
        refLat,
        refLng
      );
      return [end.lat, end.lng] as LatLngExpression;
    });
    const all = [...pts, ...ends];
    map.fitBounds(all as LatLngBoundsExpression, { padding: [40, 40] });
  }, [readings, map]);
  return null;
}

export default function MapView() {
  const { readings } = useReadingsStore();
  const estimate = useMemo(() => estimateSource(readings), [readings]);
  const center: LatLngExpression = readings.length
    ? [
        readings.reduce((a, r) => a + r.lat, 0) / readings.length,
        readings.reduce((a, r) => a + r.lng, 0) / readings.length,
      ]
    : [0, 0];

  const { refLat, refLng } = getRef(readings);

  return (
    <div className="h-full w-full overflow-hidden shadow">
      <MapContainer
        center={center}
        zoom={readings.length ? 13 : 2}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {readings.map((r) => {
          const end = rayEndpoint(
            { lat: r.lat, lng: r.lng },
            r.directionDeg,
            RAY_LENGTH_M,
            refLat,
            refLng
          );
          return (
            <React.Fragment key={r.readingId}>
              <CircleMarker
                center={[r.lat, r.lng]}
                radius={6}
              >
                <Tooltip permanent>{r.id}</Tooltip>
              </CircleMarker>
              <Polyline
                positions={[[r.lat, r.lng], [end.lat, end.lng]]}
                weight={7}
                opacity={0.9}
              />
              {typeof r.strength === "number" && r.strength > 0 && (
                <Circle
                  center={[r.lat, r.lng]}
                  radius={r.strength}
                  pathOptions={{ dashArray: "6 6" }}
                />
              )}
            </React.Fragment>
          );
        })}

        {estimate && (
          <>
            {/* Circle of 50m radius around estimate */}
            <Circle
              center={[estimate.lat, estimate.lng]}
              radius={50}
              pathOptions={{ color: "red", fillColor: "red", fillOpacity: 0.2 }}
            />
            {/* Small dot at the exact point */}
            <CircleMarker
              center={[estimate.lat, estimate.lng]}
              radius={6}
              pathOptions={{ color: "red" }}
            >
              <Tooltip permanent>
                📍 Est. Source
                <br />
                {estimate.lat.toFixed(6)}, {estimate.lng.toFixed(6)}
              </Tooltip>
            </CircleMarker>
          </>
        )}

        <AutoFitBounds />
      </MapContainer>
    </div>
  );
}
