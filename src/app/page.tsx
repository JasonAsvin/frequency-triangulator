"use client";

import dynamic from "next/dynamic";
import ControlPanel from "@/components/ControlPanel";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default function HomePage() {
  return (
    <div className="flex">
      <div className="w-96 h-screen">
        <ControlPanel />
      </div>
      <div className="flex-1 h-screen">
        <MapView />
      </div>
    </div>
  );
}