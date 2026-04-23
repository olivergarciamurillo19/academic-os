import type { Metadata } from "next";

import { getAppearance } from "@/actions/preferences";
import { AppearanceForm } from "@/features/appearance/appearance-form";

export const metadata: Metadata = {
  title: "Apariencia · Ajustes",
};

export default async function SettingsAppearancePage() {
  const appearance = await getAppearance();
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 md:p-6 lg:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Apariencia</h1>
        <p className="text-sm text-muted-foreground">
          Color, fuente y densidad. Los cambios se aplican al instante.
        </p>
      </header>
      <AppearanceForm initial={appearance} />
    </div>
  );
}
