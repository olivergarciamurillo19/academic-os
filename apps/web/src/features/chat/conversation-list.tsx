"use client";

import { format, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";
import { MessageSquarePlus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { Conversation } from "./types";

interface ConversationListProps {
  conversations: readonly Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return "Hoy";
  if (isYesterday(d)) return "Ayer";
  return format(d, "d MMM", { locale: es });
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: ConversationListProps) {
  return (
    <div className="flex h-full flex-col gap-2 border-r bg-card p-2">
      <Button onClick={onNew} className="w-full justify-start" variant="outline">
        <MessageSquarePlus className="mr-2 h-4 w-4" />
        Nueva conversación
      </Button>
      {conversations.length === 0 ? (
        <p className="px-2 py-4 text-xs text-muted-foreground">
          Aún no tienes conversaciones. Empieza una nueva.
        </p>
      ) : (
        <ul className="flex flex-col gap-0.5 overflow-y-auto">
          {conversations.map((c) => {
            const active = c.id === activeId;
            return (
              <li key={c.id} className="group">
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    className={cn(
                      "flex flex-1 flex-col items-start gap-0.5 rounded-md px-2 py-2 text-left text-sm transition-colors",
                      active
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <span className="w-full truncate font-medium">{c.title || "Sin título"}</span>
                    <span className="text-[10px]">{dayLabel(c.updatedAtISO)}</span>
                  </button>
                  <button
                    type="button"
                    aria-label="Eliminar conversación"
                    onClick={() => onDelete(c.id)}
                    className="mr-1 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
