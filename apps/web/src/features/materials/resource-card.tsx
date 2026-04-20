"use client";

import { CheckCircle2, Loader2, Trash2, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { ResourceIcon } from "./resource-icon";
import { useResourceActions } from "./resource-store";
import { formatBytes, type DocumentStatus, type ResourceRecord } from "./types";

interface ResourceCardProps {
  resource: ResourceRecord;
}

export function ResourceCard({ resource }: ResourceCardProps) {
  const { removeResource } = useResourceActions();
  const [deleting, setDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await removeResource(resource.id);
      toast.success(`Eliminado: ${resource.name}`);
      setOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al eliminar";
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  }

  const date = new Date(resource.uploadedAtISO);
  const dateLabel = new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <ResourceIcon kind={resource.kind} />
      <Link
        href={{ pathname: `/subjects/${resource.subjectId}/resources/${resource.id}` }}
        className="flex flex-1 flex-col gap-0.5 overflow-hidden hover:underline"
      >
        <span className="truncate text-sm font-medium">{resource.name}</span>
        <span className="truncate text-xs text-muted-foreground">
          {formatBytes(resource.sizeBytes)} · <time dateTime={resource.uploadedAtISO}>{dateLabel}</time>
        </span>
      </Link>

      <StatusBadge status={resource.documentStatus ?? null} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Eliminar ${resource.name}`}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar recurso</DialogTitle>
            <DialogDescription>
              ¿Seguro que quieres eliminar <span className="font-medium">{resource.name}</span>? Puede
              recuperarse volviendo a subirlo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? "Eliminando…" : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: DocumentStatus }) {
  if (status === null || status === undefined) return null;
  if (status === "indexed") {
    return (
      <Badge variant="secondary" className="gap-1 whitespace-nowrap text-[10px] uppercase">
        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
        Indexado
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge variant="destructive" className="gap-1 whitespace-nowrap text-[10px] uppercase">
        <XCircle className="h-3 w-3" />
        Error
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 whitespace-nowrap text-[10px] uppercase">
      <Loader2 className="h-3 w-3 animate-spin" />
      {status === "processing" ? "Procesando" : "Indexando"}
    </Badge>
  );
}
