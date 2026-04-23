import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Link as LinkIcon, RefreshCw } from "lucide-react";
import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getIcalIntegration,
  type IcalIntegrationState,
} from "@/features/settings/integrations-actions";

import { IcalIntegrationForm } from "./ical-form";

export const metadata: Metadata = {
  title: "Integraciones",
};

export default async function IntegrationsPage() {
  const ical = await getIcalIntegration();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 md:p-6 lg:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Integraciones</h1>
        <p className="text-sm text-muted-foreground">
          Conecta tu aula virtual para que los eventos aparezcan en el calendario automáticamente.
        </p>
      </header>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Calendar className="h-5 w-5" />
            </span>
            <div>
              <CardTitle className="text-base">Calendario iCal (Blackboard UAL)</CardTitle>
              <CardDescription>
                Pega la URL iCal del aula virtual y sincroniza cada 30 minutos.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <HowToBlock />
          <IcalIntegrationForm initial={ical} />
          {ical?.isActive ? <StatusBlock ical={ical} /> : null}
        </CardContent>
      </Card>
    </div>
  );
}

function HowToBlock() {
  return (
    <ol className="flex flex-col gap-2 rounded-md border bg-muted/40 p-4 text-sm">
      <li className="flex gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          1
        </span>
        <span>Entra en Blackboard UAL → <strong>Calendario</strong>.</span>
      </li>
      <li className="flex gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          2
        </span>
        <span>
          Pulsa el icono del engranaje (⚙) y elige <strong>Suscribirse al calendario</strong>. Verás una URL que empieza por <code className="rounded bg-background px-1">webcal://</code>.
        </span>
      </li>
      <li className="flex gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          3
        </span>
        <span>
          Copia la URL completa y pégala abajo. Al guardar, lanzamos una primera sincronización.
        </span>
      </li>
    </ol>
  );
}

function StatusBlock({ ical }: { ical: IcalIntegrationState }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm">
      <div className="flex items-center gap-2">
        <LinkIcon className="h-4 w-4 text-muted-foreground" />
        <span className="truncate text-xs text-muted-foreground">{ical.url}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <RefreshCw className="h-3 w-3" />
        {ical.lastSyncAt
          ? `Última sincronización: ${format(ical.lastSyncAt, "d MMM HH:mm", { locale: es })}`
          : "Esperando primera sincronización…"}
      </div>
    </div>
  );
}
