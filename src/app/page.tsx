"use client";

import EarthCanvas from "@/components/earth-canvas";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="flex flex-1 flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
          Earth 3D
        </h1>
        <p className="mb-6 max-w-md text-center text-zinc-600 dark:text-zinc-400">
          Drag to rotate, scroll to zoom. Built with React Three Fiber and
          Three.js.
        </p>
        <div className="w-full max-w-4xl flex-1 overflow-hidden rounded-xl shadow-xl">
          <div className="h-[50vh] min-h-[320px] w-full sm:h-[60vh] lg:h-[70vh]">
            <EarthCanvas />
          </div>
        </div>
      </main>
    </div>
  );
}
