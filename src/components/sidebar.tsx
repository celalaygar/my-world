// components/sidebar.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";

type MarkerData = {
  id: string;
  position: [number, number, number];
  color?: string;
};

// Helper function to convert Cartesian coordinates to lat/lon
function cartesianToLatLon(vec: THREE.Vector3): { lat: number; lon: number } {
  const r = vec.length();
  if (r === 0) return { lat: 0, lon: 0 };

  const x = vec.x / r;
  const y = vec.y / r;
  const z = vec.z / r;

  const phi = Math.acos(THREE.MathUtils.clamp(y, -1, 1));
  const theta = Math.atan2(z, -x);

  const RAD2DEG = 180 / Math.PI;
  const lat = 90 - phi * RAD2DEG;
  const lon = theta * RAD2DEG - 180;

  return { lat, lon };
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  markers: MarkerData[];
  onDeleteMarker: (id: string) => void;
}

export default function Sidebar({ isOpen, onClose, markers, onDeleteMarker }: SidebarProps) {
  const [currentView, setCurrentView] = useState<"menu" | "markers">("menu");

  const handleBackToMenu = () => {
    setCurrentView("menu");
  };

  const handleManageMarkers = () => {
    setCurrentView("markers");
  };

  const handleDeleteMarker = (id: string) => {
    onDeleteMarker(id);
  };

  // Convert marker position to lat/lon for display
  const getMarkerCoords = (position: [number, number, number]) => {
    const vec = new THREE.Vector3(position[0], position[1], position[2]);
    const { lat, lon } = cartesianToLatLon(vec);
    return { lat, lon };
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Sidebar */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 left-0 z-50 h-full w-80 bg-black/80 backdrop-blur-md"
          >
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white">
                  {currentView === "menu" ? "Menu" : "Manage Markers"}
                </h2>
                <button
                  onClick={onClose}
                  className="p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {currentView === "menu" ? (
                  <div>
                    <button
                      onClick={handleManageMarkers}
                      className="w-full text-left p-3 rounded-lg hover:bg-white/10 transition-colors text-white"
                    >
                      Manage Markers
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* Back button */}
                    <button
                      onClick={handleBackToMenu}
                      className="flex items-center gap-2 mb-4 p-2 rounded-lg hover:bg-white/10 transition-colors text-white"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back
                    </button>
                    
                    {/* Markers list */}
                    {markers.length === 0 ? (
                      <p className="text-white/50 text-center py-8">No markers placed yet</p>
                    ) : (
                      <div className="space-y-2">
                        {markers.map((marker, index) => {
                          const { lat, lon } = getMarkerCoords(marker.position);
                          return (
                            <div
                              key={marker.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-white/5 text-white"
                            >
                              <div>
                                <p className="font-medium">Pin #{index + 1}</p>
                                <p className="text-sm text-white/70">
                                  Lat {lat.toFixed(1)}, Lon {lon.toFixed(1)}
                                </p>
                              </div>
                              <button
                                onClick={() => handleDeleteMarker(marker.id)}
                                className="p-1 rounded-md text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}