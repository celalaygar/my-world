"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, useTexture } from "@react-three/drei";
import { motion } from "framer-motion";
import { useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

const TEXTURES_BASE_URL =
  "https://cdn.apewebapps.com/threejs/168/examples/textures/planets";

const EARTH_DAY_MAP_URL = `${TEXTURES_BASE_URL}/earth_day_4096.jpg`;
const EARTH_NORMAL_MAP_URL = `${TEXTURES_BASE_URL}/earth_normal_2048.jpg`;
const EARTH_DISPLACEMENT_ROUGHNESS_URL = `${TEXTURES_BASE_URL}/earth_bump_roughness_clouds_4096.jpg`;
const EARTH_CLOUDS_MAP_URL = `${TEXTURES_BASE_URL}/earth_clouds_2048.png`;

const MIN_DISTANCE = 1.5;
const MAX_DISTANCE = 10;

function EarthMesh() {
  const earthRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  const [dayMap, normalMap, displacementRoughnessMap, cloudsMap] = useTexture([
    EARTH_DAY_MAP_URL,
    EARTH_NORMAL_MAP_URL,
    EARTH_DISPLACEMENT_ROUGHNESS_URL,
    EARTH_CLOUDS_MAP_URL,
  ]);

  // Ensure correct colors for the day (albedo) texture.
  dayMap.colorSpace = THREE.SRGBColorSpace;
  dayMap.anisotropy = 8;

  useFrame((_, delta) => {
    if (earthRef.current) earthRef.current.rotation.y += delta * 0.08;
    if (cloudsRef.current) cloudsRef.current.rotation.y += delta * 0.11;
  });

  return (
    <group>
      <mesh ref={earthRef}>
        <sphereGeometry args={[1, 256, 256]} />
        <meshStandardMaterial
          map={dayMap}
          normalMap={normalMap}
          displacementMap={displacementRoughnessMap}
          displacementScale={0.03}
          roughnessMap={displacementRoughnessMap}
          roughness={0.9}
          metalness={0}
        />
      </mesh>

      <mesh ref={cloudsRef} scale={1.012}>
        <sphereGeometry args={[1, 128, 128]} />
        <meshStandardMaterial
          map={cloudsMap}
          transparent
          opacity={0.45}
          depthWrite={false}
          roughness={1}
          metalness={0}
        />
      </mesh>
    </group>
  );
}

function EarthScene({
  controlsRef,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  return (
    <>
      <color attach="background" args={["#00010a"]} />
      <Stars radius={120} depth={60} count={7000} factor={4} fade speed={0.5} />

      <ambientLight intensity={0.15} />
      <directionalLight
        position={[10, 3, 10]}
        intensity={2.2}
        color={"#fff5e1"}
      />
      <EarthMesh />
      <OrbitControls
        ref={controlsRef}
        enableZoom
        enableRotate
        enablePan={false}
        minDistance={MIN_DISTANCE}
        maxDistance={MAX_DISTANCE}
      />
    </>
  );
}

export default function EarthCanvas() {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [isPlacingMarker, setIsPlacingMarker] = useState(false);

  const zoomBy = (multiplier: number) => {
    const controls = controlsRef.current;
    if (!controls) return;

    const camera = controls.object as THREE.PerspectiveCamera;
    const target = controls.target.clone();

    const dir = camera.position.clone().sub(target);
    const currentDist = dir.length();
    if (currentDist === 0) return;

    const nextDist = THREE.MathUtils.clamp(
      currentDist * multiplier,
      MIN_DISTANCE,
      MAX_DISTANCE
    );

    dir.setLength(nextDist);
    camera.position.copy(target.add(dir));
    controls.update();
  };

  return (
    <div className="relative h-full w-full bg-zinc-900 rounded-xl overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <EarthScene controlsRef={controlsRef} />
      </Canvas>

      <div className="pointer-events-none fixed bottom-4 left-4 z-50 flex flex-col gap-2 sm:flex-row sm:items-center">
        <motion.button
          type="button"
          className="pointer-events-auto rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm font-medium text-white shadow-lg backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-white/30"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => zoomBy(0.9)}
        >
          Zoom In
        </motion.button>

        <motion.button
          type="button"
          className="pointer-events-auto rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm font-medium text-white shadow-lg backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-white/30"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => zoomBy(1.1)}
        >
          Zoom Out
        </motion.button>

        <motion.button
          type="button"
          className={[
            "pointer-events-auto rounded-lg border px-3 py-2 text-sm font-medium shadow-lg backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-white/30",
            isPlacingMarker
              ? "border-amber-300/40 bg-amber-400/20 text-amber-50"
              : "border-white/15 bg-white/10 text-white",
          ].join(" ")}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsPlacingMarker((v) => !v)}
        >
          Add Marker
        </motion.button>
      </div>
    </div>
  );
}
