"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Smooth Apple-like number count-up hook for KPI numbers and currency widgets
 * Runs in ~400ms with a fast, snappy ease-out cubic curve
 */
export function useCountUp(targetValue: number, duration: number = 400): number {
  const [currentValue, setCurrentValue] = useState(0);
  const startRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = currentValue;
    startTimeRef.current = null;
    let animationFrameId: number;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Fast, snappy Apple ease-out cubic curve: 1 - (1 - t)^3
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(startRef.current + (targetValue - startRef.current) * easeOut);

      setCurrentValue(next);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setCurrentValue(targetValue);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [targetValue, duration]);

  return currentValue;
}

/**
 * Formats a count-up number as Russian Rubles: 48 500 ₽
 */
export function formatCountUpCurrency(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(amount);
}
