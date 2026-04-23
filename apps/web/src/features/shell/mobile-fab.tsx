"use client";

import { CalendarPlus, CheckSquare, FileText, Plus, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface QuickAction {
  key: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  href: string;
}

const quickActions: readonly QuickAction[] = [
  {
    key: "event",
    label: "Nuevo evento",
    description: "Clase, examen, entrega, recordatorio",
    icon: CalendarPlus,
    href: "/calendar?new=1",
  },
  {
    key: "task",
    label: "Nueva tarea",
    description: "Algo que tienes que hacer",
    icon: CheckSquare,
    href: "/tasks?new=1",
  },
  {
    key: "note",
    label: "Nueva nota",
    description: "Apunte rápido en una asignatura",
    icon: FileText,
    href: "/subjects?new=note",
  },
  {
    key: "upload",
    label: "Subir documento",
    description: "PDF, imagen o texto a una asignatura",
    icon: Upload,
    href: "/subjects?new=upload",
  },
] as const;

export function MobileFab() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          aria-label="Crear rápido"
          className="fixed bottom-20 right-4 z-30 h-12 w-12 rounded-full shadow-lg lg:hidden"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="gap-0 rounded-t-2xl p-0">
        <SheetHeader className="border-b p-4 text-left">
          <SheetTitle>Crear rápido</SheetTitle>
          <SheetDescription>¿Qué quieres añadir?</SheetDescription>
        </SheetHeader>
        <ul className="divide-y">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <li key={action.key}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push(action.href);
                  }}
                  className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-accent"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-medium">{action.label}</span>
                    <span className="text-xs text-muted-foreground">{action.description}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
