"use client";

import React, { useEffect, useRef, useState } from "react";
import { useBusiness } from "@/lib/business-context";

interface AmbientMeshProps {
  activeTab?: string;
}

export const AmbientMesh: React.FC<AmbientMeshProps> = ({ activeTab }) => {
  const { currentBusiness } = useBusiness();
  const isChaika = currentBusiness === "chaika-service";

  // Cursor following spring inertia (lerp factor 0.08)
  const cursorTarget = useRef({ x: -500, y: -500, active: false });
  const cursorCurrent = useRef({ x: -500, y: -500 });
  const lightRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number | null>(null);

  // Tab switch energy burst (400ms)
  const [isBursting, setIsBursting] = useState(false);

  useEffect(() => {
    setIsBursting(true);
    const timer = setTimeout(() => setIsBursting(false), 420);
    return () => clearTimeout(timer);
  }, [currentBusiness, activeTab]);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      cursorTarget.current = {
        x: e.clientX,
        y: e.clientY,
        active: true,
      };
    };

    const handlePointerLeave = () => {
      cursorTarget.current.active = false;
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", handlePointerLeave);

    const animateCursor = () => {
      const target = cursorTarget.current;
      const current = cursorCurrent.current;

      // Lerp smoothing factor ~0.08 for physical spring lag
      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;

      if (lightRef.current) {
        if (target.active) {
          lightRef.current.style.opacity = "1";
          lightRef.current.style.transform = `translate3d(${current.x - 280}px, ${current.y - 280}px, 0)`;
        } else {
          lightRef.current.style.opacity = "0";
        }
      }

      rafId.current = requestAnimationFrame(animateCursor);
    };

    rafId.current = requestAnimationFrame(animateCursor);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none transition-opacity duration-700 opacity-95 dark:opacity-90"
    >
      {/* 4-Blob Fluid Orbital Mesh */}
      <div className={`absolute inset-0 transition-transform duration-500 ${isBursting ? "animate-energy-burst" : ""}`}>
        {isChaika ? (
          /* «Чайка-Сервис» (СТО & Автопарк): Rich Carmine, Warm Radiant Amber, Fuchsia-Wine, Coral Flame */
          <>
            {/* Global Base Aura (Ensures zero black dead-zones in center) */}
            <div
              className="absolute inset-0 opacity-45 dark:opacity-35"
              style={{
                background:
                  "radial-gradient(ellipse 90% 75% at 50% 50%, rgba(225, 29, 72, 0.28) 0%, rgba(245, 158, 11, 0.16) 45%, rgba(136, 19, 55, 0.10) 75%, transparent 100%)",
              }}
            />

            {/* Blob 1: Crimson-Scarlet Top-Right */}
            <div
              className="animate-blob-1 absolute -top-32 right-[5%] w-[820px] h-[820px] rounded-full blur-[110px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(244, 63, 94, 0.72) 0%, rgba(225, 29, 72, 0.50) 45%, rgba(159, 18, 57, 0.25) 70%, transparent 85%)",
              }}
            />

            {/* Blob 2: Warm Amber Mid-Left & Center Workspace */}
            <div
              className="animate-blob-2 absolute top-[20%] left-[10%] w-[780px] h-[780px] rounded-full blur-[120px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(245, 158, 11, 0.68) 0%, rgba(251, 146, 60, 0.45) 45%, rgba(217, 119, 6, 0.22) 70%, transparent 85%)",
              }}
            />

            {/* Blob 3: Deep Fuchsia-Wine Bottom Center */}
            <div
              className="animate-blob-3 absolute -bottom-36 left-[30%] w-[860px] h-[860px] rounded-full blur-[130px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(192, 38, 211, 0.62) 0%, rgba(159, 18, 57, 0.45) 50%, rgba(88, 28, 135, 0.22) 75%, transparent 90%)",
              }}
            />

            {/* Blob 4: Coral Flame Center-Right Fill */}
            <div
              className="animate-blob-4 absolute top-[40%] right-[18%] w-[720px] h-[720px] rounded-full blur-[115px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(255, 87, 34, 0.58) 0%, rgba(244, 63, 94, 0.40) 45%, rgba(190, 18, 60, 0.18) 70%, transparent 85%)",
              }}
            />
          </>
        ) : (
          /* «Geo AI» (Недропользование): Sapphire Blue, Radiant Cyan, Turquoise Teal, Royal Indigo */
          <>
            {/* Global Base Aura */}
            <div
              className="absolute inset-0 opacity-45 dark:opacity-35"
              style={{
                background:
                  "radial-gradient(ellipse 90% 75% at 50% 50%, rgba(14, 165, 233, 0.28) 0%, rgba(20, 184, 166, 0.16) 45%, rgba(67, 56, 202, 0.10) 75%, transparent 100%)",
              }}
            />

            {/* Blob 1: Sapphire Blue Top-Right */}
            <div
              className="animate-blob-1 absolute -top-32 right-[5%] w-[820px] h-[820px] rounded-full blur-[110px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(14, 165, 233, 0.72) 0%, rgba(2, 132, 199, 0.50) 45%, rgba(3, 105, 161, 0.25) 70%, transparent 85%)",
              }}
            />

            {/* Blob 2: Turquoise Teal Mid-Left & Center Workspace */}
            <div
              className="animate-blob-2 absolute top-[20%] left-[10%] w-[780px] h-[780px] rounded-full blur-[120px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(20, 184, 166, 0.68) 0%, rgba(13, 148, 136, 0.45) 45%, rgba(15, 118, 110, 0.22) 70%, transparent 85%)",
              }}
            />

            {/* Blob 3: Royal Indigo Bottom Center */}
            <div
              className="animate-blob-3 absolute -bottom-36 left-[30%] w-[860px] h-[860px] rounded-full blur-[130px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(99, 102, 241, 0.65) 0%, rgba(79, 70, 229, 0.45) 50%, rgba(67, 56, 202, 0.22) 75%, transparent 90%)",
              }}
            />

            {/* Blob 4: Electric Cyan Center-Right Fill */}
            <div
              className="animate-blob-4 absolute top-[40%] right-[18%] w-[720px] h-[720px] rounded-full blur-[115px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(6, 182, 212, 0.58) 0%, rgba(59, 130, 246, 0.40) 45%, rgba(30, 64, 175, 0.18) 70%, transparent 85%)",
              }}
            />
          </>
        )}
      </div>

      {/* Interactive Cursor Follower Light */}
      <div
        ref={lightRef}
        className="absolute top-0 left-0 w-[560px] h-[560px] rounded-full blur-[90px] pointer-events-none transition-opacity duration-300"
        style={{
          opacity: 0,
          background: isChaika
            ? "radial-gradient(circle, rgba(244, 63, 94, 0.24) 0%, rgba(245, 158, 11, 0.14) 45%, transparent 70%)"
            : "radial-gradient(circle, rgba(14, 165, 233, 0.24) 0%, rgba(20, 184, 166, 0.14) 45%, transparent 70%)",
          willChange: "transform, opacity",
        }}
      />
    </div>
  );
};
