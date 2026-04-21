// Shared types + constants for the appearance preferences.
// Separated from actions/preferences.ts because "use server" modules can
// only export async functions.

export const ACCENT_COLORS = [
  "ual",
  "green",
  "purple",
  "red",
  "orange",
  "pink",
  "teal",
  "yellow",
] as const;

export const FONTS = ["geist", "inter", "system"] as const;
export const DENSITIES = ["compact", "normal", "comfortable"] as const;

export type AccentColor = (typeof ACCENT_COLORS)[number];
export type AppFont = (typeof FONTS)[number];
export type AppDensity = (typeof DENSITIES)[number];

export interface AppearancePreferences {
  accentColor: AccentColor;
  font: AppFont;
  density: AppDensity;
}

export const DEFAULT_APPEARANCE: AppearancePreferences = {
  accentColor: "ual",
  font: "geist",
  density: "normal",
};
