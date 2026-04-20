import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ajustes",
};

export default function SettingsPage() {
  return (
    <div className="mx-auto flex max-w-screen-xl flex-col gap-4 p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Ajustes</h1>
      <p className="text-sm text-muted-foreground">
        Placeholder — se completa con auth/perfil/notificaciones cuando Armando tenga Supabase Auth listo.
      </p>
    </div>
  );
}
