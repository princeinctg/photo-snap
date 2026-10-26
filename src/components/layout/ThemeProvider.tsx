"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type ThemeMode = "dark" | "light" | "system";
type PrimaryColor = "emerald" | "indigo" | "amber" | "violet" | "rose" | "sky";
type BorderRadius = "sm" | "md" | "lg" | "full";

interface ThemeContextType {
  mode: ThemeMode;
  primaryColor: PrimaryColor;
  borderRadius: BorderRadius;
  setMode: (mode: ThemeMode) => void;
  setPrimaryColor: (color: PrimaryColor) => void;
  setBorderRadius: (radius: BorderRadius) => void;
  currency: string;
  currencySymbol: string;
  studioName: string;
  studioLogo: string;
  refreshSettings: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [primaryColor, setPrimaryColorState] = useState<PrimaryColor>("emerald");
  const [borderRadius, setBorderRadiusState] = useState<BorderRadius>("md");
  const [currency, setCurrency] = useState("BDT");
  const [currencySymbol, setCurrencySymbol] = useState("৳");
  const [studioName, setStudioName] = useState("PhotoSnap Studio");
  const [studioLogo, setStudioLogo] = useState("");

  const refreshSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          if (data.settings.theme?.mode) setModeState(data.settings.theme.mode);
          if (data.settings.theme?.primaryColor) setPrimaryColorState(data.settings.theme.primaryColor);
          if (data.settings.theme?.borderRadius) setBorderRadiusState(data.settings.theme.borderRadius);
          if (data.settings.currency) setCurrency(data.settings.currency);
          if (data.settings.currencySymbol) setCurrencySymbol(data.settings.currencySymbol);
          if (data.settings.studioName) setStudioName(data.settings.studioName);
          if (data.settings.logoUrl) setStudioLogo(data.settings.logoUrl);
        }
      }
    } catch {}
  };

  useEffect(() => {
    // Initial fetch from settings
    refreshSettings();

    // Check localStorage fallback
    const savedMode = localStorage.getItem("photo_studio_theme_mode") as ThemeMode | null;
    const savedColor = localStorage.getItem("photo_studio_theme_color") as PrimaryColor | null;
    const savedRadius = localStorage.getItem("photo_studio_theme_radius") as BorderRadius | null;

    if (savedMode) setModeState(savedMode);
    if (savedColor) setPrimaryColorState(savedColor);
    if (savedRadius) setBorderRadiusState(savedRadius);
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    // Apply Mode
    root.classList.remove("dark", "light");
    if (mode === "system") {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.add(systemDark ? "dark" : "light");
    } else {
      root.classList.add(mode);
    }

    // Apply Primary Color attribute
    root.setAttribute("data-theme-color", primaryColor);

    // Apply Border Radius
    const radiusMap: Record<BorderRadius, string> = {
      sm: "0.25rem",
      md: "0.5rem",
      lg: "0.75rem",
      full: "9999px",
    };
    root.style.setProperty("--radius", radiusMap[borderRadius] || "0.5rem");
  }, [mode, primaryColor, borderRadius]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem("photo_studio_theme_mode", newMode);
  };

  const setPrimaryColor = (newColor: PrimaryColor) => {
    setPrimaryColorState(newColor);
    localStorage.setItem("photo_studio_theme_color", newColor);
  };

  const setBorderRadius = (newRadius: BorderRadius) => {
    setBorderRadiusState(newRadius);
    localStorage.setItem("photo_studio_theme_radius", newRadius);
  };

  return (
    <ThemeContext.Provider
      value={{
        mode,
        primaryColor,
        borderRadius,
        setMode,
        setPrimaryColor,
        setBorderRadius,
        currency,
        currencySymbol,
        studioName,
        studioLogo,
        refreshSettings,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
