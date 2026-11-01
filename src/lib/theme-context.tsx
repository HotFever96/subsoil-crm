"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "dark" | "light";
export type ChaikaPalette = "carmine" | "cobalt" | "emerald";

export interface ChaikaPaletteOption {
  id: ChaikaPalette;
  name: string;
  tagline: string;
  primaryColor: string;
  previewColors: string[];
}

export const CHAIKA_PALETTES: ChaikaPaletteOption[] = [
  {
    id: "carmine",
    name: "Кармин & Янтарь",
    tagline: "Фирменный красный и теплый янтарь",
    primaryColor: "#DC2626",
    previewColors: ["#DC2626", "#F59E0B", "#F43F5E"],
  },
  {
    id: "cobalt",
    name: "Ле-Ман & Кобальт",
    tagline: "Спортивный высокоточный синий и ледяной неон",
    primaryColor: "#2563EB",
    previewColors: ["#2563EB", "#06B6D4", "#38BDF8"],
  },
  {
    id: "emerald",
    name: "Бритиш Рейсинг & Золото",
    tagline: "Премиальный изумрудный гран-туризмо и золото",
    primaryColor: "#059669",
    previewColors: ["#059669", "#EAB308", "#10B981"],
  },
];

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  chaikaPalette: ChaikaPalette;
  setChaikaPalette: (palette: ChaikaPalette) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
  chaikaPalette: "carmine",
  setChaikaPalette: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>("light");
  const [chaikaPalette, setChaikaPaletteState] = useState<ChaikaPalette>("carmine");

  useEffect(() => {
    // Theme load
    const saved = localStorage.getItem("geonedra_theme") as Theme | null;
    if (saved === "dark") {
      setTheme("dark");
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
    }

    // Chaika Palette load
    const savedPalette = localStorage.getItem("chaika_color_preset") as ChaikaPalette | null;
    if (savedPalette && ["carmine", "cobalt", "emerald"].includes(savedPalette)) {
      setChaikaPaletteState(savedPalette);
      document.documentElement.setAttribute("data-chaika-palette", savedPalette);
    } else {
      document.documentElement.setAttribute("data-chaika-palette", "carmine");
    }
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const nextTheme: Theme = prev === "dark" ? "light" : "dark";
      localStorage.setItem("geonedra_theme", nextTheme);
      if (nextTheme === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.setAttribute("data-theme", "light");
      }
      return nextTheme;
    });
  };

  const setChaikaPalette = (palette: ChaikaPalette) => {
    setChaikaPaletteState(palette);
    try {
      localStorage.setItem("chaika_color_preset", palette);
    } catch {}
    document.documentElement.setAttribute("data-chaika-palette", palette);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, chaikaPalette, setChaikaPalette }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
