"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type BusinessMode = "geo-ai" | "chaika-service";

interface BusinessContextType {
  currentBusiness: BusinessMode;
  setBusiness: (mode: BusinessMode) => void;
  toggleBusiness: () => void;
  isChaika: boolean;
}

const BusinessContext = createContext<BusinessContextType>({
  currentBusiness: "geo-ai",
  setBusiness: () => {},
  toggleBusiness: () => {},
  isChaika: false,
});

export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentBusiness, setCurrentBusiness] = useState<BusinessMode>("geo-ai");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("geonedra_active_business") as BusinessMode | null;
      if (saved === "chaika-service" || saved === "geo-ai") {
        setCurrentBusiness(saved);
        document.documentElement.setAttribute("data-business", saved);
      } else {
        document.documentElement.setAttribute("data-business", "geo-ai");
      }
    }
  }, []);

  const setBusiness = (mode: BusinessMode) => {
    setCurrentBusiness(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("geonedra_active_business", mode);
      document.documentElement.setAttribute("data-business", mode);
      window.dispatchEvent(new CustomEvent("geonedra_business_changed", { detail: mode }));
    }
  };

  const toggleBusiness = () => {
    const nextMode: BusinessMode = currentBusiness === "geo-ai" ? "chaika-service" : "geo-ai";
    setBusiness(nextMode);
  };

  return (
    <BusinessContext.Provider
      value={{
        currentBusiness,
        setBusiness,
        toggleBusiness,
        isChaika: currentBusiness === "chaika-service",
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => useContext(BusinessContext);
