"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body>
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
          <h1 className="text-2xl font-semibold">Algo se rompió.</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Hemos avisado al equipo. Prueba a recargar; si el problema persiste, escríbenos.
          </p>
          <Button onClick={() => reset()}>Reintentar</Button>
        </main>
      </body>
    </html>
  );
}
