"use client";

import React, { useEffect, useRef } from "react";
import { useBusiness } from "@/lib/business-context";
import { useTheme } from "@/lib/theme-context";

interface AmbientMeshProps {
  activeTab?: string;
}

export const AmbientMesh: React.FC<AmbientMeshProps> = () => {
  const { currentBusiness } = useBusiness();
  const { theme, chaikaPalette } = useTheme();
  const isChaika = currentBusiness === "chaika-service";
  const isDark = theme === "dark";

  // Cursor following spring inertia (lerp factor 0.08)
  const cursorTarget = useRef({ x: -500, y: -500, active: false });
  const cursorCurrent = useRef({ x: -500, y: -500 });
  const lightRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number | null>(null);

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

  // Determine Chaika mesh colors based on current palette & theme
  const renderChaikaMesh = () => {
    if (chaikaPalette === "cobalt") {
      // Le Mans Cobalt & Cyan Palette
      if (isDark) {
        return (
          <>
            <div
              className="absolute inset-0 opacity-40"
              style={{
                background:
                  "radial-gradient(ellipse 90% 75% at 50% 50%, rgba(37, 99, 235, 0.28) 0%, rgba(6, 182, 212, 0.16) 45%, rgba(30, 58, 138, 0.10) 75%, transparent 100%)",
              }}
            />
            <div
              className="animate-blob-1 absolute -top-32 right-[5%] w-[820px] h-[820px] rounded-full blur-[110px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(37, 99, 235, 0.65) 0%, rgba(2, 132, 199, 0.45) 45%, rgba(30, 58, 138, 0.22) 70%, transparent 85%)",
              }}
            />
            <div
              className="animate-blob-2 absolute top-[20%] left-[10%] w-[780px] h-[780px] rounded-full blur-[120px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(6, 182, 212, 0.55) 0%, rgba(59, 130, 246, 0.40) 45%, rgba(29, 78, 216, 0.20) 70%, transparent 85%)",
              }}
            />
            <div
              className="animate-blob-3 absolute -bottom-36 left-[30%] w-[860px] h-[860px] rounded-full blur-[130px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(99, 102, 241, 0.58) 0%, rgba(67, 56, 202, 0.40) 50%, rgba(30, 27, 75, 0.22) 75%, transparent 90%)",
              }}
            />
            <div
              className="animate-blob-4 absolute top-[40%] right-[18%] w-[720px] h-[720px] rounded-full blur-[115px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(56, 189, 248, 0.50) 0%, rgba(14, 165, 233, 0.35) 45%, rgba(30, 64, 175, 0.16) 70%, transparent 85%)",
              }}
            />
          </>
        );
      } else {
        // Cobalt Light
        return (
          <>
            <div
              className="absolute inset-0 opacity-40"
              style={{
                background:
                  "radial-gradient(ellipse 90% 75% at 50% 50%, rgba(37, 99, 235, 0.08) 0%, rgba(6, 182, 212, 0.06) 45%, rgba(148, 163, 184, 0.06) 75%, transparent 100%)",
              }}
            />
            <div
              className="animate-blob-1 absolute -top-32 right-[5%] w-[820px] h-[820px] rounded-full blur-[120px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(37, 99, 235, 0.14) 0%, rgba(96, 165, 250, 0.07) 45%, transparent 75%)",
              }}
            />
            <div
              className="animate-blob-2 absolute top-[20%] left-[10%] w-[780px] h-[780px] rounded-full blur-[125px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, rgba(56, 189, 248, 0.08) 45%, transparent 75%)",
              }}
            />
            <div
              className="animate-blob-3 absolute -bottom-36 left-[30%] w-[860px] h-[860px] rounded-full blur-[130px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(147, 197, 253, 0.20) 0%, rgba(191, 219, 254, 0.09) 50%, transparent 80%)",
              }}
            />
            <div
              className="animate-blob-4 absolute top-[40%] right-[18%] w-[720px] h-[720px] rounded-full blur-[120px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(45, 212, 191, 0.12) 0%, rgba(153, 246, 228, 0.05) 45%, transparent 75%)",
              }}
            />
          </>
        );
      }
    }

    if (chaikaPalette === "emerald") {
      // British Racing Emerald & Gold Palette
      if (isDark) {
        return (
          <>
            <div
              className="absolute inset-0 opacity-40"
              style={{
                background:
                  "radial-gradient(ellipse 90% 75% at 50% 50%, rgba(5, 150, 105, 0.28) 0%, rgba(234, 179, 8, 0.16) 45%, rgba(6, 78, 59, 0.10) 75%, transparent 100%)",
              }}
            />
            <div
              className="animate-blob-1 absolute -top-32 right-[5%] w-[820px] h-[820px] rounded-full blur-[110px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(16, 185, 129, 0.65) 0%, rgba(5, 150, 105, 0.45) 45%, rgba(6, 78, 59, 0.22) 70%, transparent 85%)",
              }}
            />
            <div
              className="animate-blob-2 absolute top-[20%] left-[10%] w-[780px] h-[780px] rounded-full blur-[120px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(234, 179, 8, 0.55) 0%, rgba(202, 138, 4, 0.40) 45%, rgba(161, 98, 7, 0.20) 70%, transparent 85%)",
              }}
            />
            <div
              className="animate-blob-3 absolute -bottom-36 left-[30%] w-[860px] h-[860px] rounded-full blur-[130px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(13, 148, 136, 0.58) 0%, rgba(15, 118, 110, 0.40) 50%, rgba(19, 78, 74, 0.22) 75%, transparent 90%)",
              }}
            />
            <div
              className="animate-blob-4 absolute top-[40%] right-[18%] w-[720px] h-[720px] rounded-full blur-[115px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(132, 204, 22, 0.45) 0%, rgba(101, 163, 13, 0.30) 45%, rgba(63, 98, 18, 0.15) 70%, transparent 85%)",
              }}
            />
          </>
        );
      } else {
        // Emerald Light
        return (
          <>
            <div
              className="absolute inset-0 opacity-40"
              style={{
                background:
                  "radial-gradient(ellipse 90% 75% at 50% 50%, rgba(5, 150, 105, 0.08) 0%, rgba(234, 179, 8, 0.06) 45%, rgba(148, 163, 184, 0.06) 75%, transparent 100%)",
              }}
            />
            <div
              className="animate-blob-1 absolute -top-32 right-[5%] w-[820px] h-[820px] rounded-full blur-[120px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(16, 185, 129, 0.14) 0%, rgba(52, 211, 153, 0.07) 45%, transparent 75%)",
              }}
            />
            <div
              className="animate-blob-2 absolute top-[20%] left-[10%] w-[780px] h-[780px] rounded-full blur-[125px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(234, 179, 8, 0.14) 0%, rgba(250, 204, 21, 0.07) 45%, transparent 75%)",
              }}
            />
            <div
              className="animate-blob-3 absolute -bottom-36 left-[30%] w-[860px] h-[860px] rounded-full blur-[130px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(20, 184, 166, 0.16) 0%, rgba(94, 234, 212, 0.08) 50%, transparent 80%)",
              }}
            />
            <div
              className="animate-blob-4 absolute top-[40%] right-[18%] w-[720px] h-[720px] rounded-full blur-[120px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(132, 204, 22, 0.10) 0%, rgba(190, 242, 100, 0.05) 45%, transparent 75%)",
              }}
            />
          </>
        );
      }
    }

    // Default: Carmine & Amber Palette
    if (isDark) {
      return (
        <>
          <div
            className="absolute inset-0 opacity-45 dark:opacity-35"
            style={{
              background:
                "radial-gradient(ellipse 90% 75% at 50% 50%, rgba(225, 29, 72, 0.28) 0%, rgba(245, 158, 11, 0.16) 45%, rgba(136, 19, 55, 0.10) 75%, transparent 100%)",
            }}
          />
          <div
            className="animate-blob-1 absolute -top-32 right-[5%] w-[820px] h-[820px] rounded-full blur-[110px]"
            style={{
              background:
                "radial-gradient(circle, rgba(244, 63, 94, 0.72) 0%, rgba(225, 29, 72, 0.50) 45%, rgba(159, 18, 57, 0.25) 70%, transparent 85%)",
            }}
          />
          <div
            className="animate-blob-2 absolute top-[20%] left-[10%] w-[780px] h-[780px] rounded-full blur-[120px]"
            style={{
              background:
                "radial-gradient(circle, rgba(245, 158, 11, 0.68) 0%, rgba(251, 146, 60, 0.45) 45%, rgba(217, 119, 6, 0.22) 70%, transparent 85%)",
            }}
          />
          <div
            className="animate-blob-3 absolute -bottom-36 left-[30%] w-[860px] h-[860px] rounded-full blur-[130px]"
            style={{
              background:
                "radial-gradient(circle, rgba(192, 38, 211, 0.62) 0%, rgba(159, 18, 57, 0.45) 50%, rgba(88, 28, 135, 0.22) 75%, transparent 90%)",
            }}
          />
          <div
            className="animate-blob-4 absolute top-[40%] right-[18%] w-[720px] h-[720px] rounded-full blur-[115px]"
            style={{
              background:
                "radial-gradient(circle, rgba(255, 87, 34, 0.58) 0%, rgba(244, 63, 94, 0.40) 45%, rgba(190, 18, 60, 0.18) 70%, transparent 85%)",
            }}
          />
        </>
      );
    } else {
      return (
        <>
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background:
                "radial-gradient(ellipse 90% 75% at 50% 50%, rgba(245, 158, 11, 0.08) 0%, rgba(148, 163, 184, 0.08) 45%, rgba(226, 232, 240, 0.06) 75%, transparent 100%)",
            }}
          />
          <div
            className="animate-blob-1 absolute -top-32 right-[5%] w-[820px] h-[820px] rounded-full blur-[120px]"
            style={{
              background:
                "radial-gradient(circle, rgba(239, 68, 68, 0.12) 0%, rgba(248, 113, 113, 0.06) 45%, transparent 75%)",
            }}
          />
          <div
            className="animate-blob-2 absolute top-[20%] left-[10%] w-[780px] h-[780px] rounded-full blur-[125px]"
            style={{
              background:
                "radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, rgba(251, 191, 36, 0.07) 45%, transparent 75%)",
            }}
          />
          <div
            className="animate-blob-3 absolute -bottom-36 left-[30%] w-[860px] h-[860px] rounded-full blur-[130px]"
            style={{
              background:
                "radial-gradient(circle, rgba(147, 197, 253, 0.20) 0%, rgba(191, 219, 254, 0.09) 50%, transparent 80%)",
            }}
          />
          <div
            className="animate-blob-4 absolute top-[40%] right-[18%] w-[720px] h-[720px] rounded-full blur-[120px]"
            style={{
              background:
                "radial-gradient(circle, rgba(251, 146, 60, 0.12) 0%, rgba(254, 215, 170, 0.05) 45%, transparent 75%)",
            }}
          />
        </>
      );
    }
  };

  const getCursorGradient = () => {
    if (!isChaika) {
      return "radial-gradient(circle, rgba(14, 165, 233, 0.24) 0%, rgba(20, 184, 166, 0.14) 45%, transparent 70%)";
    }
    if (chaikaPalette === "cobalt") {
      return isDark
        ? "radial-gradient(circle, rgba(37, 99, 235, 0.24) 0%, rgba(6, 182, 212, 0.14) 45%, transparent 70%)"
        : "radial-gradient(circle, rgba(37, 99, 235, 0.10) 0%, rgba(14, 165, 233, 0.08) 45%, transparent 70%)";
    }
    if (chaikaPalette === "emerald") {
      return isDark
        ? "radial-gradient(circle, rgba(16, 185, 129, 0.24) 0%, rgba(234, 179, 8, 0.14) 45%, transparent 70%)"
        : "radial-gradient(circle, rgba(16, 185, 129, 0.10) 0%, rgba(234, 179, 8, 0.08) 45%, transparent 70%)";
    }
    return isDark
      ? "radial-gradient(circle, rgba(244, 63, 94, 0.24) 0%, rgba(245, 158, 11, 0.14) 45%, transparent 70%)"
      : "radial-gradient(circle, rgba(245, 158, 11, 0.10) 0%, rgba(147, 197, 253, 0.08) 45%, transparent 70%)";
  };

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none transition-opacity duration-700 opacity-95 dark:opacity-90"
    >
      {/* 4-Blob Fluid Orbital Mesh */}
      <div className="absolute inset-0">
        {isChaika ? (
          renderChaikaMesh()
        ) : (
          /* «Geo AI» (Недропользование): Sapphire Blue, Radiant Cyan, Turquoise Teal, Royal Indigo */
          <>
            <div
              className="absolute inset-0 opacity-45 dark:opacity-35"
              style={{
                background:
                  "radial-gradient(ellipse 90% 75% at 50% 50%, rgba(14, 165, 233, 0.28) 0%, rgba(20, 184, 166, 0.16) 45%, rgba(67, 56, 202, 0.10) 75%, transparent 100%)",
              }}
            />
            <div
              className="animate-blob-1 absolute -top-32 right-[5%] w-[820px] h-[820px] rounded-full blur-[110px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(14, 165, 233, 0.72) 0%, rgba(2, 132, 199, 0.50) 45%, rgba(3, 105, 161, 0.25) 70%, transparent 85%)",
              }}
            />
            <div
              className="animate-blob-2 absolute top-[20%] left-[10%] w-[780px] h-[780px] rounded-full blur-[120px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(20, 184, 166, 0.68) 0%, rgba(13, 148, 136, 0.45) 45%, rgba(15, 118, 110, 0.22) 70%, transparent 85%)",
              }}
            />
            <div
              className="animate-blob-3 absolute -bottom-36 left-[30%] w-[860px] h-[860px] rounded-full blur-[130px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(99, 102, 241, 0.65) 0%, rgba(79, 70, 229, 0.45) 50%, rgba(67, 56, 202, 0.22) 75%, transparent 90%)",
              }}
            />
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
          background: getCursorGradient(),
          willChange: "transform, opacity",
        }}
      />
    </div>
  );
};
