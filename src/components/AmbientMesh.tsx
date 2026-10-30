"use client";

import React from "react";
import { useBusiness } from "@/lib/business-context";

export const AmbientMesh: React.FC = () => {
  const { currentBusiness } = useBusiness();
  const isChaika = currentBusiness === "chaika-service";

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none transition-opacity duration-1000"
    >
      {isChaika ? (
        /* «Чайка-Сервис» ambient glow: Crimson-scarlet, warm amber, wine-violet on velvet dark */
        <div className="absolute inset-0">
          {/* Crimson-scarlet top-right orb */}
          <div
            className="animate-orb-1 absolute -top-32 right-[5%] w-[620px] h-[620px] rounded-full opacity-40 dark:opacity-30 blur-[120px]"
            style={{
              background: "radial-gradient(circle, rgba(225, 29, 72, 0.55) 0%, rgba(244, 63, 94, 0.25) 50%, transparent 75%)",
            }}
          />

          {/* Warm amber mid-left orb */}
          <div
            className="animate-orb-2 absolute top-[35%] -left-36 w-[560px] h-[560px] rounded-full opacity-35 dark:opacity-22 blur-[130px]"
            style={{
              background: "radial-gradient(circle, rgba(245, 158, 11, 0.45) 0%, rgba(251, 191, 36, 0.18) 55%, transparent 80%)",
            }}
          />

          {/* Deep wine-violet / burgundy bottom-center orb */}
          <div
            className="animate-orb-3 absolute -bottom-36 left-[30%] w-[680px] h-[680px] rounded-full opacity-40 dark:opacity-28 blur-[140px]"
            style={{
              background: "radial-gradient(circle, rgba(136, 19, 55, 0.50) 0%, rgba(88, 28, 135, 0.25) 50%, transparent 80%)",
            }}
          />
        </div>
      ) : (
        /* «Geo AI» ambient glow: Sapphire blue, turquoise, deep indigo */
        <div className="absolute inset-0">
          {/* Sapphire blue top-right orb */}
          <div
            className="animate-orb-1 absolute -top-32 right-[10%] w-[620px] h-[620px] rounded-full opacity-40 dark:opacity-30 blur-[120px]"
            style={{
              background: "radial-gradient(circle, rgba(14, 165, 233, 0.50) 0%, rgba(2, 132, 199, 0.25) 50%, transparent 75%)",
            }}
          />

          {/* Turquoise mid-left orb */}
          <div
            className="animate-orb-2 absolute top-[30%] -left-32 w-[540px] h-[540px] rounded-full opacity-35 dark:opacity-22 blur-[130px]"
            style={{
              background: "radial-gradient(circle, rgba(20, 184, 166, 0.45) 0%, rgba(13, 148, 136, 0.20) 55%, transparent 80%)",
            }}
          />

          {/* Deep indigo bottom-center orb */}
          <div
            className="animate-orb-3 absolute -bottom-32 left-[25%] w-[660px] h-[660px] rounded-full opacity-35 dark:opacity-25 blur-[140px]"
            style={{
              background: "radial-gradient(circle, rgba(99, 102, 241, 0.45) 0%, rgba(79, 70, 229, 0.22) 50%, transparent 80%)",
            }}
          />
        </div>
      )}
    </div>
  );
};
