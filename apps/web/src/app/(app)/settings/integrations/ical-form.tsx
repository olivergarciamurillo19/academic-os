"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  disconnectIcalIntegration,
  saveIcalIntegration,
  type IcalIntegrationState,
} from "@/features/settings/integrations-actions";

interface Props {
  initial: IcalIntegrationState | null;
}

export function IcalIntegrationForm({ initial }: Props) {
  const [url, setUrl] = useState<string>(initial?.url ?? "");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveIcalIntegration(formData);
      if (res.ok) {
        toast.success("Calendario conectado. Sincronizando…");
      } else {
        toast.error(res.message);
      }
    });
  }

  function handleDisconnect() {
    startTransition(async () => {
      const res = await disconnectIcalIntegration();
      if (res.ok) {
        toast.success("Calendario desconectado.");
        setUrl("");
      } else {
        toast.error(res.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ical-url">URL iCal</Label>
        <Input
          id="ical-url"
          name="url"
          type="url"
          required
          autoComplete="off"
          placeholder="webcal://blackboard.ual.es/… o https://…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : initial ? "Actualizar y sincronizar" : "Conectar"}
        </Button>
        {initial?.isActive ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleDisconnect}
            disabled={pending}
          >
            Desconectar
          </Button>
        ) : null}
      </div>
    </form>
  );
}
