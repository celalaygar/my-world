"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, useTexture } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

const TEXTURES_BASE_URL =
  "https://cdn.apewebapps.com/threejs/168/examples/textures/planets";

const EARTH_DAY_MAP_URL = `${TEXTURES_BASE_URL}/earth_day_4096.jpg`;
const EARTH_NORMAL_MAP_URL = `${TEXTURES_BASE_URL}/earth_normal_2048.jpg`;
const EARTH_DISPLACEMENT_ROUGHNESS_URL = `${TEXTURES_BASE_URL}/earth_bump_roughness_clouds_4096.jpg`;
const EARTH_CLOUDS_MAP_URL = `${TEXTURES_BASE_URL}/earth_clouds_2048.png`;

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

function EarthScene() {
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
        enableZoom
        enableRotate
        enablePan={false}
        minDistance={1.5}
        maxDistance={10}
      />
    </>
  );
}

export default function EarthCanvas() {
  return (
    <div className="relative h-full w-full bg-zinc-900 rounded-xl overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <EarthScene />
      </Canvas>
    </div>
  );
}
