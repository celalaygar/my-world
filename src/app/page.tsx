"use client";

import EarthCanvas from "@/components/earth-canvas";

export default function Home() {
  return (
    <div className="fixed inset-0 h-screen w-screen overflow-hidden bg-black">
      <EarthCanvas />
    </div>
  );
}
