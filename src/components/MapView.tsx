"use client";
import { MapContainer, TileLayer, Polyline, CircleMarker, Circle, useMap, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import type { LatLngExpression, LatLngBoundsExpression } from "leaflet";
import { useReadingsStore } from "@/store/useReadingsStore";
import { estimateSource, getRef, rayEndpoint } from "@/lib/triangulation";
import React from "react";
import L from "leaflet";

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

// Fix map size when container dimensions change
function MapSizeFix() {
  const map = useMap();

  useEffect(() => {
    // Small delay to ensure DOM has updated
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => clearTimeout(timer);
  }, [map]);

  // Also listen to window resize events
  useEffect(() => {
    const handleResize = () => {
      map.invalidateSize();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [map]);

  return null;
}

// Reposition zoom controls based on control panel state
function ZoomControlPositioner() {
  const map = useMap();

  useEffect(() => {
    // Get the zoom control element
    const zoomControl = document.querySelector(".leaflet-top.leaflet-left") as HTMLElement;
    if (!zoomControl) return;

    // Add smooth transition to the zoom control
    zoomControl.style.transition = "left 0.3s ease-in-out, top 0.3s ease-in-out";

    // Get the control panel to check if it's collapsed
    const controlPanel = document.querySelector("[style*='translateX']") as HTMLElement;
    if (!controlPanel) return;

    const handlePanelChange = () => {
      const transform = controlPanel.style.transform;
      const isCollapsed = transform.includes("translateX(-100%)");

      if (isCollapsed) {
        // Panel hidden: zoom controls at top-left corner
        zoomControl.style.left = "10px";
        zoomControl.style.top = "10px";
      } else {
        // Panel visible: zoom controls beside the panel
        zoomControl.style.left = "394px"; // w-96 (384px) + gap (10px)
        zoomControl.style.top = "10px";
      }
    };

    // Initial position
    handlePanelChange();

    // Watch for changes using MutationObserver
    const observer = new MutationObserver(() => {
      handlePanelChange();
    });

    observer.observe(controlPanel, {
      attributes: true,
      attributeFilter: ["style"],
    });

    return () => observer.disconnect();
  }, [map]);

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

  // Define bounds to prevent vertical dragging beyond poles
  // Horizontal is unlimited (wraps around globe)
  const southWest = L.latLng(-85, -Infinity);
  const northEast = L.latLng(85, Infinity);
  const bounds = L.latLngBounds(southWest, northEast);

  return (
    // make the map occupy the full viewport and sit below the control panel
    <div className="absolute inset-0 z-0 overflow-hidden">
      <MapContainer
        center={center}
        zoom={readings.length ? 13 : 2}
        minZoom={3}
        maxZoom={18}
        maxBounds={bounds}
        maxBoundsViscosity={1.0}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          noWrap={false}
        />

        <MapSizeFix />
        <ZoomControlPositioner />

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
