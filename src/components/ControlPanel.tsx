"use client";
import { FormEvent, useState, useMemo, useEffect } from "react";
import { useReadingsStore } from "@/store/useReadingsStore";
import { estimateSource } from "@/lib/triangulation";
import Image from "next/image";

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
    deleteFromBackend,
    deleteAllFromBackend,
    remove,
    subscribeBackend,
  } = useReadingsStore();

  const [deviceId, setDeviceId] = useState("dev-1");
  const [lat, setLat] = useState<number | "">("");
  const [lng, setLng] = useState<number | "">("");
  const [direction, setDirection] = useState<number | "">("");
  const [darkMode, setDarkMode] = useState(false);
  // collapsed → fully hide panel, only show toggle tab
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<"manual" | "history">("manual");

  // Load dark mode preference from localStorage on mount
  useEffect(() => {
    const savedDarkMode = localStorage.getItem("darkMode");
    if (savedDarkMode !== null) {
      setDarkMode(JSON.parse(savedDarkMode));
    }
  }, []);

  // Save dark mode preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

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
  async function saveHistory() {
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

    // Delete all readings from Firestore before clearing locally
    await deleteAllFromBackend();
  }

  function resetForm() {
    setDeviceId("dev-1");
    setLat("");
    setLng("");
    setDirection("");
  }

  return (
    <>
      {/* Sliding panel (overlaying map) */}
      <div
        className={`fixed top-0 left-0 h-full w-96 z-50 transition-transform duration-300 backdrop-blur-sm ${
          darkMode
            ? "text-white bg-gray-900/95 border-r border-gray-700/50"
            : "text-gray-900 bg-white/95 border-r border-gray-200/50"
        }`}
        // fully hide when collapsed
        style={{
          transform: collapsed ? "translateX(-100%)" : "translateX(0)",
        }}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className={`p-6 flex justify-between items-center border-b ${
            darkMode ? "border-gray-700/50 bg-gradient-to-r from-blue-600/10 to-purple-600/10" : "border-gray-200/50 bg-gradient-to-r from-blue-50 to-purple-50"
          }`}>
            <div className="flex items-center gap-3">
              <Image
                src="/komlekdam-logo.png"
                alt="KOMLEKDAM Logo"
                width={40}
                height={40}
                className="object-contain"
              />
              <h2 className="font-bold text-xl tracking-tight">KOMLEKDAM</h2>
            </div>
             <button
              onClick={() => setDarkMode(!darkMode)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                darkMode 
                  ? "bg-gray-800 border border-gray-600 hover:bg-gray-700" 
                  : "bg-white border border-gray-300 hover:bg-gray-50 shadow-sm"
              }`}
            >
              {darkMode ? "☀️ Light" : "🌙 Dark"}
            </button>
          </div>

          {/* Tabs */}
          <div className={`flex border-b ${darkMode ? "border-gray-700/50" : "border-gray-200/50"}`}>
            {["manual", "history"].map((tab) => (
              <button
                key={tab}
                className={`flex-1 py-3 text-sm font-medium transition-all ${
                  activeTab === tab
                    ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                    : "opacity-60 hover:opacity-100"
                }`}
                onClick={() => setActiveTab(tab as any)}
              >
                {tab === "manual" ? "Manual Entry" : "History"}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeTab === "manual" && (
              <>
                {/* Manual Entry Form */}
                <div>
                  <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                    <span className="text-xl">📍</span>
                    Manual Coordinate Entry
                  </h3>
                  <form onSubmit={onSubmit} className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-2 opacity-70">Device ID</label>
                      <input
                        className={`w-full rounded-lg px-4 py-2.5 border transition-all focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 ${
                          darkMode 
                            ? "bg-gray-800/50 border-gray-700 focus:bg-gray-800" 
                            : "bg-gray-50 border-gray-300 focus:bg-white"
                        }`}
                        value={deviceId}
                        onChange={(e) => setDeviceId(e.target.value)}
                        placeholder="Device-1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 opacity-70">Latitude</label>
                      <input
                        className={`w-full rounded-lg px-4 py-2.5 border transition-all focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 ${
                          darkMode 
                            ? "bg-gray-800/50 border-gray-700 focus:bg-gray-800" 
                            : "bg-gray-50 border-gray-300 focus:bg-white"
                        }`}
                        value={lat}
                        onChange={(e) => setLat(e.target.value as any)}
                        placeholder="0.000000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 opacity-70">Longitude</label>
                      <input
                        className={`w-full rounded-lg px-4 py-2.5 border transition-all focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 ${
                          darkMode 
                            ? "bg-gray-800/50 border-gray-700 focus:bg-gray-800" 
                            : "bg-gray-50 border-gray-300 focus:bg-white"
                        }`}
                        value={lng}
                        onChange={(e) => setLng(e.target.value as any)}
                        placeholder="0.000000"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-2 opacity-70">
                        Direction (deg)
                      </label>
                      <input
                        className={`w-full rounded-lg px-4 py-2.5 border transition-all focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 ${
                          darkMode 
                            ? "bg-gray-800/50 border-gray-700 focus:bg-gray-800" 
                            : "bg-gray-50 border-gray-300 focus:bg-white"
                        }`}
                        value={direction}
                        onChange={(e) => setDirection(e.target.value as any)}
                        placeholder="0-360"
                      />
                    </div>
                    <div className="col-span-2 flex gap-3 mt-2">
                      <button
                        type="submit"
                        className="flex-1 rounded-lg px-4 py-2.5 font-medium shadow-md bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 transition-all hover:shadow-lg"
                      >
                        Add Reading
                      </button>
                      <button
                        type="button"
                        onClick={resetForm}
                        className={`rounded-lg px-4 py-2.5 font-medium border transition-all ${
                          darkMode 
                            ? "border-gray-600 hover:bg-gray-800" 
                            : "border-gray-300 hover:bg-gray-100 shadow-sm"
                        }`}
                      >
                        Reset All
                      </button>
                    </div>
                  </form>
                </div>

                {/* Estimated Source Info */}
                <div className={`rounded-xl p-5 shadow-lg border ${
                  darkMode 
                    ? "bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-700/30" 
                    : "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200/50"
                }`}>
                  <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                    <span className="text-xl">🎯</span>
                    Estimated Source
                  </h2>
                  {estimate ? (
                    <p className="text-sm font-mono bg-black/5 dark:bg-white/5 rounded-lg px-3 py-2">
                      Lat: {estimate.lat.toFixed(6)}, Lng: {estimate.lng.toFixed(6)}
                    </p>
                  ) : (
                    <p className="text-sm opacity-60 italic">Not enough data yet</p>
                  )}
                </div>
              </>
            )}

            {activeTab === "history" && (
              <div>
                <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                  <span className="text-xl">📋</span>
                  Coordinate History ({readings.length})
                </h3>
                {readings.length === 0 ? (
                  <div className={`rounded-lg p-8 text-center border-2 border-dashed ${
                    darkMode ? "border-gray-700" : "border-gray-300"
                  }`}>
                    <p className="text-sm opacity-60 italic">No readings yet.</p>
                  </div>
                ) : (
                  <ul className="space-y-3 mb-6">
                    {readings.map((r) => (
                      <li
                        key={r.readingId}
                        className={`flex items-center justify-between rounded-lg border p-4 transition-all hover:shadow-md ${
                          darkMode 
                            ? "bg-gray-800/30 border-gray-700 hover:bg-gray-800/50" 
                            : "bg-white border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="text-sm">
                          <div className="font-mono font-semibold mb-1">{r.id}</div>
                          <div className="opacity-80">
                            lat {r.lat.toFixed(6)}, lng {r.lng.toFixed(6)}
                          </div>
                          <div className="opacity-80">dir {r.directionDeg.toFixed(1)}°</div>
                          <div className="opacity-60 text-xs mt-1">
                            {new Date(r.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            remove(r.readingId); // optimistic local update
                            await deleteFromBackend(r.readingId);
                          }}
                          className={`rounded-lg px-3 py-2 text-sm font-medium border transition-all hover:bg-red-500 hover:text-white hover:border-red-500 ${
                            darkMode 
                              ? "border-gray-600 hover:bg-red-600" 
                              : "border-gray-300"
                          }`}
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  onClick={saveHistory}
                  className="rounded-lg px-4 py-3 font-medium shadow-md bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 transition-all hover:shadow-lg w-full"
                  disabled={readings.length === 0}
                >
                  💾 Save & Clear History
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toggle tab (rectangular, attached to panel edge, like Google Maps) */}
      <button
        aria-label={collapsed ? "Open panel" : "Close panel"}
        onClick={() => setCollapsed((s) => !s)}
        className={`fixed top-1/2 -translate-y-1/2 z-50 transition-all duration-300 shadow-xl hover:shadow-2xl backdrop-blur-sm ${
          darkMode 
            ? "bg-gray-800/95 text-white border-gray-700/50" 
            : "bg-white/95 text-gray-700 border-gray-300/50"
        }`}
        style={{
          left: collapsed ? "0px" : "384px",
          borderTopRightRadius: "0.5rem",
          borderBottomRightRadius: "0.5rem",
          padding: "0.75rem 0.5rem",
          borderRight: "1px solid",
          borderTop: "1px solid",
          borderBottom: "1px solid",
          borderColor: darkMode ? "rgb(55, 65, 81)" : "rgb(229, 231, 235)",
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className={`w-5 h-5 transition-transform duration-300 ${collapsed ? "rotate-0" : "rotate-180"}`}
          fill="currentColor"
        >
          <path d="M9.29 6.71a1 1 0 011.42 0L15 11l-4.29 4.29a1 1 0 11-1.42-1.42L12.17 11 9.29 8.12a1 1 0 010-1.41z" />
        </svg>
      </button>
    </>
  );
}
