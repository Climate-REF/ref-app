import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "theme";

function getStored(): ThemeMode | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark") return v;
    return null;
  } catch {
    return null;
  }
}

function getSystem(): ThemeMode {
  if (window?.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function getInitial(): ThemeMode {
  return getStored() ?? getSystem();
}

/**
 * useTheme
 * - Manages light/dark theme
 * - Persists preference in localStorage
 * - Syncs with system preference changes when no explicit user pref is stored
 * - Applies/removes the "dark" class on document.documentElement
 */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(getInitial);

  // Apply theme and persist
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  // Sync with system changes if user hasn't explicitly set a preference
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const stored = getStored();
      if (!stored) {
        setThemeState(getSystem());
      }
    };
    try {
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    } catch {
      // Safari fallback
      mql.addListener?.(handler);
      return () => {
        mql.removeListener?.(handler);
      };
    }
  }, []);

  const setTheme = (value: ThemeMode) => setThemeState(value);
  const toggle = () => setThemeState((t) => (t === "dark" ? "light" : "dark"));

  return { theme, setTheme, toggle };
}
