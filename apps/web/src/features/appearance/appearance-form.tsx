"use client";

import { Check } from "lucide-react";

import type {
  AccentColor,
  AppDensity,
  AppFont,
  AppearancePreferences,
} from "@/actions/preferences-types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";


import { useAppearance } from "./appearance-provider";
import {
  ACCENT_LABELS,
  ACCENT_TOKENS,
  DENSITY_LABELS,
  FONT_LABELS,
  FONT_STACKS,
} from "./tokens";

interface AppearanceFormProps {
  initial: AppearancePreferences;
}

const ACCENT_KEYS: AccentColor[] = [
  "ual",
  "green",
  "purple",
  "red",
  "orange",
  "pink",
  "teal",
  "yellow",
];
const FONT_KEYS: AppFont[] = ["geist", "inter", "system"];
const DENSITY_KEYS: AppDensity[] = ["compact", "normal", "comfortable"];

export function AppearanceForm({ initial }: AppearanceFormProps) {
  const { appearance, setAppearance } = useAppearance();
  const current = {
    accentColor: appearance.accentColor || initial.accentColor,
    font: appearance.font || initial.font,
    density: appearance.density || initial.density,
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Color de acento</CardTitle>
          <CardDescription>El tono principal de la app.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
            {ACCENT_KEYS.map((key) => {
              const tokens = ACCENT_TOKENS[key];
              const active = current.accentColor === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAppearance({ accentColor: key })}
                  aria-pressed={active}
                  aria-label={ACCENT_LABELS[key]}
                  className={cn(
                    "relative flex h-12 w-12 items-center justify-center rounded-full outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-offset-2",
                    active && "ring-2 ring-offset-2",
                  )}
                  style={{
                    backgroundColor: tokens.primary,
                    color: tokens.primaryForeground,
                  }}
                >
                  {active ? <Check className="h-5 w-5" /> : null}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Seleccionado: <span className="font-medium">{ACCENT_LABELS[current.accentColor]}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fuente</CardTitle>
          <CardDescription>Cómo se ven los textos.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-3">
            {FONT_KEYS.map((key) => {
              const active = current.font === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAppearance({ font: key })}
                  aria-pressed={active}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-lg border px-3 py-2 text-left transition-colors hover:border-primary/60",
                    active && "border-primary bg-primary/5",
                  )}
                >
                  <span
                    className="text-base font-medium"
                    style={{ fontFamily: FONT_STACKS[key] }}
                  >
                    Aa
                  </span>
                  <span className="text-xs text-muted-foreground">{FONT_LABELS[key]}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Densidad</CardTitle>
          <CardDescription>Cuánto espacio ocupan los elementos.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-3">
            {DENSITY_KEYS.map((key) => {
              const active = current.density === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAppearance({ density: key })}
                  aria-pressed={active}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm transition-colors hover:border-primary/60",
                    active && "border-primary bg-primary/5",
                  )}
                >
                  {DENSITY_LABELS[key]}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
