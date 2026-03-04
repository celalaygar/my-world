"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, useTexture } from "@react-three/drei";
import { motion } from "framer-motion";
import { useMemo, useRef, useState } from "react";
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
const EARTH_RADIUS = 1;
const MARKER_RADIUS = 0.02;
const MARKER_SURFACE_OFFSET = 0.001;

type MarkerData = {
  id: string;
  position: [number, number, number]; // stored in Earth's local space
  color?: string;
};

function GlowingMarker({
  position,
  color = "#fbbf24",
}: {
  position: [number, number, number];
  color?: string;
}) {
  const markerRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!markerRef.current) return;
    const pulse = 1 + Math.sin(clock.getElapsedTime() * 5) * 0.12;
    markerRef.current.scale.setScalar(pulse);
  });

  return (
    <mesh ref={markerRef} position={position}>
      <sphereGeometry args={[MARKER_RADIUS, 24, 24]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={2.2}
        roughness={0.25}
        metalness={0}
        toneMapped={false}
      />
    </mesh>
  );
}

function EarthMesh({
  markers,
  isPlacingMarker,
  onPlaceMarker,
}: {
  markers: MarkerData[];
  isPlacingMarker: boolean;
  onPlaceMarker: (position: [number, number, number]) => void;
}) {
  const earthGroupRef = useRef<THREE.Group>(null);
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
    if (earthGroupRef.current) earthGroupRef.current.rotation.y += delta * 0.08;
    if (cloudsRef.current) cloudsRef.current.rotation.y += delta * 0.11;
  });

  const markerMeshes = useMemo(
    () =>
      markers.map((m) => (
        <GlowingMarker key={m.id} position={m.position} color={m.color} />
      )),
    [markers]
  );

  return (
    <group>
      <group ref={earthGroupRef}>
        <mesh
          onPointerDown={(e) => {
            if (!isPlacingMarker) return;
            e.stopPropagation();

            // e.point is in world space. Convert to Earth's local space so the marker
            // stays attached while the Earth rotates.
            const local = earthGroupRef.current
              ? earthGroupRef.current.worldToLocal(e.point.clone())
              : e.point.clone();

            local
              .normalize()
              .multiplyScalar(EARTH_RADIUS + MARKER_SURFACE_OFFSET);

            onPlaceMarker([local.x, local.y, local.z]);
          }}
        >
          <sphereGeometry args={[EARTH_RADIUS, 256, 256]} />
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

        {markerMeshes}
      </group>

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
  markers,
  isPlacingMarker,
  onPlaceMarker,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  markers: MarkerData[];
  isPlacingMarker: boolean;
  onPlaceMarker: (position: [number, number, number]) => void;
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
      <EarthMesh
        markers={markers}
        isPlacingMarker={isPlacingMarker}
        onPlaceMarker={onPlaceMarker}
      />
      <OrbitControls
        ref={controlsRef}
        enableZoom
        enableRotate
        enablePan={false}
        enabled={!isPlacingMarker}
        minDistance={MIN_DISTANCE}
        maxDistance={MAX_DISTANCE}
      />
    </>
  );
}

export default function EarthCanvas() {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [isPlacingMarker, setIsPlacingMarker] = useState(false);
  const [markers, setMarkers] = useState<MarkerData[]>([]);

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

  const handlePlaceMarker = (position: [number, number, number]) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `marker-${Date.now()}`;

    setMarkers((prev) => [...prev, { id, position, color: "#fbbf24" }]);
    setIsPlacingMarker(false);
  };

  return (
    <div className="relative h-full w-full bg-zinc-900 rounded-xl overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <EarthScene
          controlsRef={controlsRef}
          markers={markers}
          isPlacingMarker={isPlacingMarker}
          onPlaceMarker={handlePlaceMarker}
        />
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

        {isPlacingMarker ? (
          <div className="pointer-events-none text-xs text-white/80 sm:ml-2">
            Click the Earth to place a marker
          </div>
        ) : null}
      </div>
    </div>
  );
}
