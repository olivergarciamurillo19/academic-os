import type {
  AccentColor,
  AppDensity,
  AppFont,
} from "@/actions/preferences-types";

export interface AccentTokens {
  primary: string;
  primaryForeground: string;
  ring: string;
}

export const ACCENT_TOKENS: Record<AccentColor, AccentTokens> = {
  ual: {
    primary: "oklch(0.52 0.17 252)",
    primaryForeground: "oklch(0.98 0 0)",
    ring: "oklch(0.52 0.17 252 / 0.5)",
  },
  green: {
    primary: "oklch(0.55 0.15 145)",
    primaryForeground: "oklch(0.98 0 0)",
    ring: "oklch(0.55 0.15 145 / 0.5)",
  },
  purple: {
    primary: "oklch(0.50 0.20 290)",
    primaryForeground: "oklch(0.98 0 0)",
    ring: "oklch(0.50 0.20 290 / 0.5)",
  },
  red: {
    primary: "oklch(0.52 0.18 15)",
    primaryForeground: "oklch(0.98 0 0)",
    ring: "oklch(0.52 0.18 15 / 0.5)",
  },
  orange: {
    primary: "oklch(0.60 0.17 45)",
    primaryForeground: "oklch(0.15 0 0)",
    ring: "oklch(0.60 0.17 45 / 0.5)",
  },
  pink: {
    primary: "oklch(0.58 0.18 335)",
    primaryForeground: "oklch(0.98 0 0)",
    ring: "oklch(0.58 0.18 335 / 0.5)",
  },
  teal: {
    primary: "oklch(0.55 0.14 185)",
    primaryForeground: "oklch(0.98 0 0)",
    ring: "oklch(0.55 0.14 185 / 0.5)",
  },
  yellow: {
    primary: "oklch(0.65 0.15 85)",
    primaryForeground: "oklch(0.15 0 0)",
    ring: "oklch(0.65 0.15 85 / 0.5)",
  },
};

export const ACCENT_LABELS: Record<AccentColor, string> = {
  ual: "Azul UAL",
  green: "Verde",
  purple: "Morado",
  red: "Rojo",
  orange: "Naranja",
  pink: "Rosa",
  teal: "Teal",
  yellow: "Amarillo",
};

export const FONT_STACKS: Record<AppFont, string> = {
  geist: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
  inter: "Inter, ui-sans-serif, system-ui, sans-serif",
  system:
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

export const FONT_LABELS: Record<AppFont, string> = {
  geist: "Geist (default)",
  inter: "Inter",
  system: "Sistema",
};

/** Root font-size in pixels. Tailwind spacing scales with rem, so this
 * effectively tunes the whole spacing system at once. */
export const DENSITY_FONT_SIZE: Record<AppDensity, string> = {
  compact: "14px",
  normal: "16px",
  comfortable: "18px",
};

export const DENSITY_LABELS: Record<AppDensity, string> = {
  compact: "Compacto",
  normal: "Normal",
  comfortable: "Amplio",
};

export const SUBJECT_COLOR_SWATCHES: readonly string[] = [
  "#2563EB",
  "#10B981",
  "#8B5CF6",
  "#EF4444",
  "#F59E0B",
  "#EC4899",
  "#14B8A6",
  "#F97316",
  "#6366F1",
  "#84CC16",
  "#06B6D4",
  "#A855F7",
] as const;
