import { BookOpen, Calendar, CheckSquare, GraduationCap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Inicio",
};

const quickLinks = [
  {
    title: "Asignaturas",
    description: "Todo el material y recursos de tus asignaturas.",
    href: "/subjects" as const,
    icon: BookOpen,
  },
  {
    title: "Calendario",
    description: "Clases, exámenes y entregas.",
    href: "/calendar" as const,
    icon: Calendar,
  },
  {
    title: "Tareas",
    description: "Lo que tienes que hacer esta semana.",
    href: "/tasks" as const,
    icon: CheckSquare,
  },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto flex max-w-screen-xl flex-col gap-6 p-4 md:p-6 lg:p-8">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" aria-hidden="true" />
          <Badge variant="secondary" className="text-xs uppercase tracking-wide">
            Academic OS
          </Badge>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Hola, Óliver
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Aquí tienes un resumen de tu día. Todo lo que necesitas está a un clic.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href} className="group">
              <Card className="h-full transition-colors group-hover:border-primary/60">
                <CardHeader className="gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="flex flex-col gap-1">
                    <CardTitle className="text-base">{link.title}</CardTitle>
                    <CardDescription>{link.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Próximamente</CardTitle>
          <CardDescription>
            Aquí verás tus próximos eventos, tareas pendientes y sugerencias de la IA cuando el
            backend esté conectado.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Dashboard placeholder — pendiente de datos reales de Drizzle/Supabase.
        </CardContent>
      </Card>
    </div>
  );
}
