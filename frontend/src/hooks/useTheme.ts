import { useCallback, useEffect, useState } from "react";

/** What the visitor picked. "system" follows the OS rather than pinning a theme. */
export type ThemeMode = "light" | "dark" | "system";

/** The theme actually applied to the document. */
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "theme";

/** The order the toggle button walks through. */
const CYCLE: ThemeMode[] = ["light", "dark", "system"];

function getStored(): ThemeMode | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
    return null;
  } catch {
    return null;
  }
}

function getSystem(): ResolvedTheme {
  if (window?.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

/**
 * useTheme
 * - Cycles light, then dark, then system
 * - Persists the pick in localStorage, and applies the "dark" class to the document
 * - Follows the OS while the pick is "system"
 */
export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => getStored() ?? "system");
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystem);

  const theme: ResolvedTheme = mode === "system" ? systemTheme : mode;

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Storage can be blocked, and the theme still applies for this visit.
    }
  }, [mode]);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setSystemTheme(mql.matches ? "dark" : "light");
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

  const cycle = useCallback(() => {
    setMode((current) => CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length]);
  }, []);

  return { mode, theme, setTheme: setMode, cycle };
}
