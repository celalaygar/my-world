"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";
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
const RAD2DEG = 180 / Math.PI;

// Pin marker dimensions (in world units on unit sphere)
const PIN_CONE_HEIGHT = 0.06;
const PIN_HEAD_RADIUS = 0.022;
const PIN_CUTOUT_RADIUS = 0.007;
const PIN_RING_INNER = 0.018;
const PIN_RING_OUTER = 0.028;
const PIN_RING_PULSE_MIN = 0.85;
const PIN_RING_PULSE_MAX = 1.15;
const PIN_RED = "#dc2626";
const PIN_WHITE = "#fafafa";

// Zoom animation
const ZOOM_DURATION_MS = 1200;

// Distance-based marker scale: keep markers visible at all zoom levels
const MARKER_SCALE_REF_DISTANCE = 2.5; // distance at which scale = 1
const MARKER_SCALE_MIN = 0.5;
const MARKER_SCALE_MAX = 2.2;

type MarkerData = {
  id: string;
  position: [number, number, number]; // stored in Earth's local space
  color?: string;
};

type ZoomAnimationState = {
  targetDist: number;
  startDist: number;
  startTime: number;
  duration: number;
};

function easeInOutCubic(t: number): number {
  return t * t * (3 - 2 * t);
}

function ZoomAnimator({
  controlsRef,
  zoomAnimationRef,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  zoomAnimationRef: React.MutableRefObject<ZoomAnimationState | null>;
}) {
  const dirRef = useRef(new THREE.Vector3());
  const targetRef = useRef(new THREE.Vector3());

  useFrame(() => {
    const anim = zoomAnimationRef.current;
    if (!anim || !controlsRef.current) return;

    const camera = controlsRef.current.object as THREE.PerspectiveCamera;
    const controls = controlsRef.current;
    const elapsed = performance.now() - anim.startTime;
    let t = Math.min(1, elapsed / anim.duration);
    t = easeInOutCubic(t);

    const currentDist = THREE.MathUtils.lerp(anim.startDist, anim.targetDist, t);
    targetRef.current.copy(controls.target);
    dirRef.current.subVectors(camera.position, targetRef.current).normalize();
    dirRef.current.multiplyScalar(currentDist);
    camera.position.copy(targetRef.current).add(dirRef.current);
    controls.update();

    if (t >= 1) zoomAnimationRef.current = null;
  });

  return null;
}

function cartesianToLatLon(vec: THREE.Vector3): { lat: number; lon: number } {
  const r = vec.length();
  if (r === 0) return { lat: 0, lon: 0 };

  const x = vec.x / r;
  const y = vec.y / r;
  const z = vec.z / r;

  const phi = Math.acos(THREE.MathUtils.clamp(y, -1, 1)); // 0 (north pole) .. π (south)
  const theta = Math.atan2(z, -x); // matches latLonToCartesian mapping

  const lat = 90 - phi * RAD2DEG;
  const lon = theta * RAD2DEG - 180;

  return { lat, lon };
}

function PinMarker({
  id,
  position,
  color = PIN_RED,
  onRemove,
}: {
  id: string;
  position: [number, number, number];
  color?: string;
  onRemove: (id: string) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const worldPosRef = useRef(new THREE.Vector3());

  const normal = useMemo(() => {
    const v = new THREE.Vector3(position[0], position[1], position[2]);
    v.normalize();
    return v;
  }, [position]);

  useFrame(({ camera }) => {
    if (!groupRef.current) return;

    // Distance-based scale: larger when zoomed out, smaller when zoomed in
    groupRef.current.getWorldPosition(worldPosRef.current);
    const distance = camera.position.distanceTo(worldPosRef.current);
    const distanceScale =
      distance / MARKER_SCALE_REF_DISTANCE;
    const scale = THREE.MathUtils.clamp(
      distanceScale,
      MARKER_SCALE_MIN,
      MARKER_SCALE_MAX
    );
    groupRef.current.scale.setScalar(scale);

    // Pin stands along surface normal (Y = normal in group space)
    groupRef.current.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      normal
    );

    // Billboard: rotate around normal so pin "front" (+Z) faces camera
    const toCam = new THREE.Vector3().subVectors(camera.position, worldPosRef.current);
    const tangent = toCam.clone().addScaledVector(normal, -toCam.dot(normal));
    if (tangent.lengthSq() < 1e-6) return;
    tangent.normalize();

    const zAxis = new THREE.Vector3(0, 0, 1).applyQuaternion(groupRef.current.quaternion);
    const angle = Math.atan2(
      new THREE.Vector3().crossVectors(zAxis, tangent).dot(normal),
      zAxis.dot(tangent)
    );
    groupRef.current.quaternion.premultiply(
      new THREE.Quaternion().setFromAxisAngle(normal, angle)
    );

    if (ringRef.current) {
      const t = performance.now() * 0.002;
      const s = PIN_RING_PULSE_MIN + (PIN_RING_PULSE_MAX - PIN_RING_PULSE_MIN) * (0.5 + 0.5 * Math.sin(t));
      ringRef.current.scale.setScalar(s);
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onRemove(id);
      }}
    >
      {/* Teardrop: cone (tip at origin) + spherical head */}
      <mesh position={[0, PIN_CONE_HEIGHT, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[PIN_HEAD_RADIUS, PIN_CONE_HEIGHT, 24]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
      </mesh>
      <mesh position={[0, PIN_CONE_HEIGHT, 0]}>
        <sphereGeometry args={[PIN_HEAD_RADIUS, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
      </mesh>
      {/* White circular cutout on the front of the head */}
      <mesh position={[0, PIN_CONE_HEIGHT, PIN_HEAD_RADIUS + 0.001]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[PIN_CUTOUT_RADIUS, 16]} />
        <meshBasicMaterial color={PIN_WHITE} side={THREE.DoubleSide} />
      </mesh>
      {/* Pulsing ring on the surface under the pin */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[PIN_RING_INNER, PIN_RING_OUTER, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

function EarthMesh({
  markers,
  isPlacingMarker,
  onPlaceMarker,
  onRemoveMarker,
  onHoverCoords,
}: {
  markers: MarkerData[];
  isPlacingMarker: boolean;
  onPlaceMarker: (position: [number, number, number]) => void;
  onRemoveMarker: (id: string) => void;
  onHoverCoords: (coords: { lat: number; lon: number } | null) => void;
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

  const markerMeshes = useMemo(
    () =>
      markers.map((m) => (
        <PinMarker
          key={m.id}
          id={m.id}
          position={m.position}
          color={m.color ?? PIN_RED}
          onRemove={onRemoveMarker}
        />
      )),
    [markers, onRemoveMarker]
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
          onPointerMove={(e) => {
            const local = earthGroupRef.current
              ? earthGroupRef.current.worldToLocal(e.point.clone())
              : e.point.clone();

            const { lat, lon } = cartesianToLatLon(local);
            onHoverCoords({ lat, lon });
          }}
          onPointerOut={() => {
            onHoverCoords(null);
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
  onRemoveMarker,
  onHoverCoords,
  zoomAnimationRef,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  markers: MarkerData[];
  isPlacingMarker: boolean;
  onPlaceMarker: (position: [number, number, number]) => void;
  onRemoveMarker: (id: string) => void;
  onHoverCoords: (coords: { lat: number; lon: number } | null) => void;
  zoomAnimationRef: React.MutableRefObject<ZoomAnimationState | null>;
}) {
  return (
    <>
      <color attach="background" args={["#000000"]} />

      <ZoomAnimator controlsRef={controlsRef} zoomAnimationRef={zoomAnimationRef} />

      <ambientLight intensity={2} color={"#ffffff"} />
      <hemisphereLight
        intensity={1.2}
        color={"#ffffff"}
        groundColor={"#ffffff"}
      />
      <EarthMesh
        markers={markers}
        isPlacingMarker={isPlacingMarker}
        onPlaceMarker={onPlaceMarker}
        onRemoveMarker={onRemoveMarker}
        onHoverCoords={onHoverCoords}
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
  const zoomAnimationRef = useRef<ZoomAnimationState | null>(null);
  const [isPlacingMarker, setIsPlacingMarker] = useState(false);
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [hoverCoords, setHoverCoords] = useState<{ lat: number; lon: number } | null>(null);

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

    zoomAnimationRef.current = {
      targetDist: nextDist,
      startDist: currentDist,
      startTime: performance.now(),
      duration: ZOOM_DURATION_MS,
    };
  };

  const handlePlaceMarker = (position: [number, number, number]) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `marker-${Date.now()}`;

    setMarkers((prev) => [...prev, { id, position, color: "#fbbf24" }]);
    setIsPlacingMarker(false);
  };

  const handleRemoveMarker = (id: string) => {
    setMarkers((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <EarthScene
          controlsRef={controlsRef}
          zoomAnimationRef={zoomAnimationRef}
          markers={markers}
          isPlacingMarker={isPlacingMarker}
          onPlaceMarker={handlePlaceMarker}
          onRemoveMarker={handleRemoveMarker}
          onHoverCoords={setHoverCoords}
        />
      </Canvas>

      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
        <div className="pointer-events-auto flex flex-col gap-2">
          <motion.button
            type="button"
            className="flex h-10 w-10 items-center justify-center border border-white/40 bg-black/40 text-[10px] font-semibold uppercase tracking-tight text-white shadow-lg backdrop-blur-sm transition focus:outline-none focus:ring-2 focus:ring-white/40"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => zoomBy(0.9)}
          >
            <div className="text-2xl">+</div>
          </motion.button>

          <motion.button
            type="button"
            className="flex h-10 w-10 items-center justify-center border border-white/40 bg-black/40 text-[10px] font-semibold uppercase tracking-tight text-white shadow-lg backdrop-blur-sm transition focus:outline-none focus:ring-2 focus:ring-white/40"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => zoomBy(1.1)}
          >
            <div className="text-2xl">−</div>
          </motion.button>

          <motion.button
            type="button"
            className={[
              "flex h-10 w-10 items-center justify-center border text-[10px] font-semibold uppercase tracking-tight shadow-lg backdrop-blur-sm transition focus:outline-none focus:ring-2 focus:ring-white/40",
              isPlacingMarker
                ? "border-amber-300/70 bg-amber-400/30 text-amber-50"
                : "border-white/40 bg-black/40 text-white",
            ].join(" ")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsPlacingMarker((v) => !v)}
          >
            
            <div className="text-2xl">•</div>
          </motion.button>
        </div>

        <p className="pointer-events-none mt-1 text-[11px] font-medium text-white/80">
          {hoverCoords
            ? `Coords: (${hoverCoords.lat.toFixed(2)}, ${hoverCoords.lon.toFixed(
                2
              )})`
            : "Coords: (Lat, Lon)"}
        </p>

        {isPlacingMarker ? (
          <p className="pointer-events-none mt-1 text-[10px] text-amber-200/80">
            Click the Earth to place a marker
          </p>
        ) : null}
      </div>
    </div>
  );
}
