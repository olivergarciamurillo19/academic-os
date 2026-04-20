export const metadata = { title: "Sin conexión" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-xl font-semibold">Sin conexión</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        No llega red. Algunas secciones guardadas siguen disponibles; el chat y
        los datos en vivo volverán en cuanto recuperes señal.
      </p>
    </main>
  );
}
