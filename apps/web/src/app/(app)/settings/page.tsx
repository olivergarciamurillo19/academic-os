import { ChevronRight, Cog, LinkIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Ajustes",
};

const sections = [
  {
    title: "Integraciones",
    description: "Conecta tu calendario iCal del aula virtual.",
    href: "/settings/integrations" as const,
    icon: LinkIcon,
  },
] as const;

export default function SettingsPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 md:p-6 lg:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Ajustes</h1>
        <p className="text-sm text-muted-foreground">
          Gestiona tu cuenta, integraciones y notificaciones.
        </p>
      </header>

      <div className="grid gap-3">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.href} href={s.href} className="group">
              <Card className="transition-colors group-hover:border-primary/60">
                <CardHeader className="flex flex-row items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <CardTitle className="text-base">{s.title}</CardTitle>
                    <CardDescription>{s.description}</CardDescription>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader className="gap-2">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Cog className="h-5 w-5" />
            </span>
            <div>
              <CardTitle className="text-base">Próximamente</CardTitle>
              <CardDescription>
                Notificaciones push, perfil académico, preferencias de estudio.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
