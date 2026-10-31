"use client";

import React from "react";
import { useBusiness } from "@/lib/business-context";

export const AmbientMesh: React.FC = () => {
  const { currentBusiness } = useBusiness();
  const isChaika = currentBusiness === "chaika-service";

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none transition-opacity duration-1000 opacity-90 dark:opacity-80"
    >
      {isChaika ? (
        /* «Чайка-Сервис» ambient glow: Crimson-scarlet, warm glowing amber, neon fuchsia-wine on velvet dark */
        <div className="absolute inset-0">
          {/* Subtle central breathing ambient wash */}
          <div
            className="absolute inset-0 opacity-50 dark:opacity-40"
            style={{
              background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(244, 63, 94, 0.22) 0%, rgba(245, 158, 11, 0.12) 40%, transparent 75%)",
            }}
          />

          {/* Crimson-scarlet top-right orb */}
          <div
            className="animate-orb-1 absolute -top-24 right-[8%] w-[680px] h-[680px] rounded-full blur-[85px]"
            style={{
              background: "radial-gradient(circle, rgba(244, 63, 94, 0.70) 0%, rgba(225, 29, 72, 0.45) 45%, rgba(159, 18, 57, 0.2) 65%, transparent 80%)",
            }}
          />

          {/* Warm amber mid-left orb */}
          <div
            className="animate-orb-2 absolute top-[28%] -left-28 w-[620px] h-[620px] rounded-full blur-[90px]"
            style={{
              background: "radial-gradient(circle, rgba(245, 158, 11, 0.65) 0%, rgba(251, 146, 60, 0.40) 45%, rgba(217, 119, 6, 0.18) 65%, transparent 80%)",
            }}
          />

          {/* Deep fuchsia / wine bottom-center-right orb */}
          <div
            className="animate-orb-3 absolute -bottom-28 left-[35%] w-[720px] h-[720px] rounded-full blur-[95px]"
            style={{
              background: "radial-gradient(circle, rgba(192, 38, 211, 0.55) 0%, rgba(159, 18, 57, 0.40) 45%, rgba(88, 28, 135, 0.22) 70%, transparent 85%)",
            }}
          />
        </div>
      ) : (
        /* «Geo AI» ambient glow: Sapphire blue, turquoise teal, deep royal indigo */
        <div className="absolute inset-0">
          {/* Subtle central breathing ambient wash */}
          <div
            className="absolute inset-0 opacity-50 dark:opacity-40"
            style={{
              background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(14, 165, 233, 0.22) 0%, rgba(20, 184, 166, 0.12) 40%, transparent 75%)",
            }}
          />

          {/* Sapphire blue top-right orb */}
          <div
            className="animate-orb-1 absolute -top-24 right-[10%] w-[680px] h-[680px] rounded-full blur-[85px]"
            style={{
              background: "radial-gradient(circle, rgba(14, 165, 233, 0.70) 0%, rgba(2, 132, 199, 0.45) 45%, rgba(3, 105, 161, 0.2) 65%, transparent 80%)",
            }}
          />

          {/* Turquoise teal mid-left orb */}
          <div
            className="animate-orb-2 absolute top-[28%] -left-28 w-[620px] h-[620px] rounded-full blur-[90px]"
            style={{
              background: "radial-gradient(circle, rgba(20, 184, 166, 0.65) 0%, rgba(13, 148, 136, 0.40) 45%, rgba(15, 118, 110, 0.18) 65%, transparent 80%)",
            }}
          />

          {/* Royal indigo bottom-center-right orb */}
          <div
            className="animate-orb-3 absolute -bottom-28 left-[35%] w-[720px] h-[720px] rounded-full blur-[95px]"
            style={{
              background: "radial-gradient(circle, rgba(99, 102, 241, 0.60) 0%, rgba(79, 70, 229, 0.40) 45%, rgba(67, 56, 202, 0.22) 70%, transparent 85%)",
            }}
          />
        </div>
      )}
    </div>
  );
};
