"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const VISITS_KEY = "academic-os:visits";
const DISMISSED_KEY = "academic-os:install-dismissed";
const THRESHOLD = 3;

export function InstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const visits = Number(localStorage.getItem(VISITS_KEY) ?? "0") + 1;
      localStorage.setItem(VISITS_KEY, String(visits));
      if (visits < THRESHOLD) return;
      if (localStorage.getItem(DISMISSED_KEY) === "1") return;

      const handler = (e: Event) => {
        e.preventDefault();
        setEvent(e as BeforeInstallPromptEvent);
        setVisible(true);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    } catch {
      // localStorage may be disabled; silently no-op.
    }
  }, []);

  if (!visible || !event) return null;

  return (
    <div className="fixed inset-x-3 bottom-24 z-40 flex items-center justify-between gap-2 rounded-lg border bg-background p-3 shadow-md sm:inset-x-auto sm:bottom-4 sm:right-4 sm:max-w-sm">
      <div className="text-sm">
        <p className="font-medium">Instalar Academic OS</p>
        <p className="text-muted-foreground text-xs">
          Úsalo desde el móvil como una app nativa.
        </p>
      </div>
      <div className="flex gap-2">
        <button
          className="rounded-md px-2 py-1 text-xs text-muted-foreground"
          onClick={() => {
            try {
              localStorage.setItem(DISMISSED_KEY, "1");
            } catch {
              /* localStorage disabled */
            }
            setVisible(false);
          }}
        >
          Ahora no
        </button>
        <button
          className="rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground"
          onClick={async () => {
            await event.prompt();
            const choice = await event.userChoice;
            if (choice.outcome === "dismissed") {
              try {
                localStorage.setItem(DISMISSED_KEY, "1");
              } catch {
              /* localStorage disabled */
            }
            }
            setVisible(false);
          }}
        >
          Instalar
        </button>
      </div>
    </div>
  );
}
