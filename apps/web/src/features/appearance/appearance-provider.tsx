"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { updateAppearance } from "@/actions/preferences";
import {
  DEFAULT_APPEARANCE,
  type AppearancePreferences,
} from "@/actions/preferences-types";

import {
  ACCENT_TOKENS,
  DENSITY_FONT_SIZE,
  FONT_STACKS,
} from "./tokens";

interface AppearanceContextValue {
  appearance: AppearancePreferences;
  setAppearance: (patch: Partial<AppearancePreferences>) => void;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

function applyToRoot(appearance: AppearancePreferences): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const tokens = ACCENT_TOKENS[appearance.accentColor];
  root.style.setProperty("--color-primary", tokens.primary);
  root.style.setProperty("--color-primary-foreground", tokens.primaryForeground);
  root.style.setProperty("--color-ring", tokens.ring);
  root.style.setProperty("--app-font-sans", FONT_STACKS[appearance.font]);
  root.style.setProperty("--app-font-size", DENSITY_FONT_SIZE[appearance.density]);
  root.dataset.accent = appearance.accentColor;
  root.dataset.font = appearance.font;
  root.dataset.density = appearance.density;
}

export function AppearanceProvider({
  initial,
  children,
}: {
  initial: AppearancePreferences;
  children: ReactNode;
}) {
  const [appearance, setAppearanceState] = useState<AppearancePreferences>(initial);

  useEffect(() => {
    applyToRoot(appearance);
  }, [appearance]);

  const setAppearance = useCallback((patch: Partial<AppearancePreferences>) => {
    setAppearanceState((prev) => {
      const next: AppearancePreferences = { ...prev, ...patch };
      applyToRoot(next);
      void updateAppearance(patch);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ appearance, setAppearance }),
    [appearance, setAppearance],
  );

  return (
    <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>
  );
}

export function useAppearance(): AppearanceContextValue {
  const ctx = useContext(AppearanceContext);
  if (!ctx) {
    return {
      appearance: DEFAULT_APPEARANCE,
      setAppearance: () => {
        /* no-op when used outside provider (e.g. auth routes) */
      },
    };
  }
  return ctx;
}
