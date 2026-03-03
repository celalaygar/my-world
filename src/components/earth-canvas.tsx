"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";

const EARTH_TEXTURE_URL =
  "https://upload.wikimedia.org/wikipedia/commons/c/c3/Solarsystemscope_texture_2k_earth_daymap.jpg";

function EarthMesh() {
  const [colorMap] = useTexture([EARTH_TEXTURE_URL]);

  return (
    <mesh>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial map={colorMap} metalness={0.1} roughness={0.7} />
    </mesh>
  );
}

function EarthScene() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} />
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
