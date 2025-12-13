"use client";
import { FormEvent, useState, useMemo, useEffect } from "react";
import { useReadingsStore } from "@/store/useReadingsStore";
import { estimateSource } from "@/lib/triangulation";

// helper: convert degrees → cardinal direction
function degToCompass(deg: number) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const idx = Math.round(deg / 45) % 8;
  return dirs[idx];
}

export default function ControlPanel() {
  const {
    readings,
    sendToBackend,
    remove,
    reset,
    subscribeBackend,
  } = useReadingsStore();

  const [deviceId, setDeviceId] = useState("dev-1");
  const [lat, setLat] = useState<number | "">("");
  const [lng, setLng] = useState<number | "">("");
  const [direction, setDirection] = useState<number | "">("");
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"manual" | "history">("manual");

  // 🔁 Start listening to Firebase when component mounts
  useEffect(() => {
    const unsub = subscribeBackend();
    return () => unsub(); // cleanup on unmount
  }, [subscribeBackend]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (lat === "" || lng === "" || direction === "") return;

    // ✍️ Write directly to Firestore
    await sendToBackend({
      id: deviceId.trim() || "dev-1",
      lat: Number(lat),
      lng: Number(lng),
      directionDeg: Number(direction),
      timestamp: Date.now(),
    });

    setLat("");
    setLng("");
    setDirection("");
  }

  const estimate = useMemo(() => estimateSource(readings), [readings]);

  // 💾 Export to TXT
  function saveHistory() {
    if (readings.length === 0) return;

    const content = readings
      .map(
        (r) =>
          `ID: ${r.id}, Lat: ${r.lat}, Lng: ${r.lng}, Dir: ${r.directionDeg}°, Time: ${new Date(
            r.timestamp
          ).toLocaleString()}`
      )
      .join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "coordinates_history.txt";
    a.click();
    URL.revokeObjectURL(url);

    reset();
  }

  return (
    <div
      className={`fixed top-0 left-0 h-full w-96 ${
        darkMode ? "bg-gray-900 text-white" : "bg-white text-black"
      }`}
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-4 flex justify-between items-center border-b">
          <h2 className="font-bold text-lg">Control Panel</h2>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="rounded-xl px-3 py-1 border"
          >
            {darkMode ? "Light" : "Dark"}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {["manual", "history"].map((tab) => (
            <button
              key={tab}
              className={`flex-1 py-2 ${
                activeTab === tab
                  ? "border-b-2 border-blue-600 font-semibold"
                  : "opacity-70"
              }`}
              onClick={() => setActiveTab(tab as any)}
            >
              {tab === "manual" ? "Manual Entry" : "History"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "manual" && (
            <>
              {/* Manual Entry Form */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">
                  Manual Coordinate Entry
                </h3>
                <form onSubmit={onSubmit} className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-sm mb-1">Device ID</label>
                    <input
                      className="w-full rounded-xl px-3 py-2 bg-black/5 border"
                      value={deviceId}
                      onChange={(e) => setDeviceId(e.target.value)}
                      placeholder="dev-1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Latitude</label>
                    <input
                      className="w-full rounded-xl px-3 py-2 bg-black/5 border"
                      value={lat}
                      onChange={(e) => setLat(e.target.value as any)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Longitude</label>
                    <input
                      className="w-full rounded-xl px-3 py-2 bg-black/5 border"
                      value={lng}
                      onChange={(e) => setLng(e.target.value as any)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">
                      Direction (deg)
                    </label>
                    <input
                      className="w-full rounded-xl px-3 py-2 bg-black/5 border"
                      value={direction}
                      onChange={(e) => setDirection(e.target.value as any)}
                    />
                  </div>
                  <div className="col-span-2 flex gap-3">
                    <button
                      type="submit"
                      className="rounded-xl px-4 py-2 shadow bg-blue-600 text-white"
                    >
                      Add Reading
                    </button>
                    <button
                      type="button"
                      onClick={reset}
                      className="rounded-xl px-4 py-2 shadow border"
                    >
                      Reset All
                    </button>
                  </div>
                </form>
              </div>

              {/* Estimated Source Info */}
              <div className="rounded-2xl p-4 shadow bg-green-500/10 border border-green-500/30">
                <h2 className="text-lg font-semibold mb-2">Estimated Source</h2>
                {estimate ? (
                  <p className="text-sm font-mono">
                    Lat: {estimate.lat.toFixed(6)}, Lng: {estimate.lng.toFixed(6)}
                  </p>
                ) : (
                  <p className="text-sm opacity-70">Not enough data yet</p>
                )}
              </div>
            </>
          )}

          {activeTab === "history" && (
            <div>
              <h3 className="text-lg font-semibold mb-3">
                Coordinate History ({readings.length})
              </h3>
              {readings.length === 0 ? (
                <p className="text-sm opacity-70">No readings yet.</p>
              ) : (
                <ul className="space-y-2 mb-4">
                  {readings.map((r) => (
                    <li
                      key={r.readingId}
                      className="flex items-center justify-between rounded-xl border p-3"
                    >
                      <div className="text-sm">
                        <div className="font-mono">{r.id}</div>
                        <div>
                          lat {r.lat.toFixed(6)}, lng {r.lng.toFixed(6)}
                        </div>
                        <div>dir {r.directionDeg.toFixed(1)}°</div>
                        <div className="opacity-70 text-xs">
                          {new Date(r.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <button
                        onClick={() => remove(r.readingId)}
                        className="rounded-lg px-3 py-2 border"
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                onClick={saveHistory}
                className="rounded-xl px-4 py-2 shadow bg-green-600 text-white w-full"
              >
                Save & Clear History
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
