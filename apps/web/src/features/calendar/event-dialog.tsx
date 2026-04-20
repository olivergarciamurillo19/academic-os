"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mockSubjects } from "@/features/subjects/mock-data";

import { eventFormSchema, type EventFormValues } from "./event-schema";
import { newEventId, useCalendarActions } from "./event-store";
import {
  eventSourceLabels,
  eventTypeLabels,
  type CalendarEvent,
  type EventSource,
  type EventType,
} from "./types";

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: CalendarEvent | null;
  defaultSubjectId?: string;
  defaultStartISO?: string;
}

function nonEmpty(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function toDateParts(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function fromDateParts(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

export function EventDialog({
  open,
  onOpenChange,
  event,
  defaultSubjectId,
  defaultStartISO,
}: EventDialogProps) {
  const { upsert, remove } = useCalendarActions();

  const baseISO = defaultStartISO ?? new Date().toISOString();
  const start = event ? toDateParts(event.startISO) : toDateParts(baseISO);
  const end = event
    ? toDateParts(event.endISO)
    : toDateParts(new Date(new Date(baseISO).getTime() + 60 * 60 * 1000).toISOString());

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: event?.title ?? "",
      subjectId: event?.subjectId ?? defaultSubjectId ?? "",
      type: event?.type ?? "class",
      source: event?.source ?? "manual",
      startDate: start.date,
      startTime: start.time,
      endDate: end.date,
      endTime: end.time,
      location: event?.location ?? "",
      description: event?.description ?? "",
    },
  });

  // Reset when opening for a different event / default slot.
  useEffect(() => {
    if (!open) return;
    const s = event ? toDateParts(event.startISO) : toDateParts(baseISO);
    const e = event
      ? toDateParts(event.endISO)
      : toDateParts(new Date(new Date(baseISO).getTime() + 60 * 60 * 1000).toISOString());
    form.reset({
      title: event?.title ?? "",
      subjectId: event?.subjectId ?? defaultSubjectId ?? "",
      type: event?.type ?? "class",
      source: event?.source ?? "manual",
      startDate: s.date,
      startTime: s.time,
      endDate: e.date,
      endTime: e.time,
      location: event?.location ?? "",
      description: event?.description ?? "",
    });
  }, [open, event, baseISO, defaultSubjectId, form]);

  function handleSubmit(values: EventFormValues) {
    const next: CalendarEvent = {
      id: event?.id ?? newEventId(),
      subjectId: values.subjectId && values.subjectId.length > 0 ? values.subjectId : null,
      title: values.title,
      type: values.type,
      source: values.source,
      startISO: fromDateParts(values.startDate, values.startTime),
      endISO: fromDateParts(values.endDate, values.endTime),
      location: nonEmpty(values.location),
      description: nonEmpty(values.description),
      allDay: false,
    };
    upsert(next);
    toast.success(event ? "Evento actualizado" : "Evento creado");
    onOpenChange(false);
  }

  function handleDelete() {
    if (!event) return;
    remove(event.id);
    toast.success("Evento eliminado");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{event ? "Editar evento" : "Nuevo evento"}</DialogTitle>
          <DialogDescription>
            Solo los eventos de origen &quot;Manual&quot; son arrastrables en el calendario.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Título</Label>
            <Input id="title" {...form.register("title")} />
            {form.formState.errors.title && (
              <span className="text-xs text-destructive">
                {form.formState.errors.title.message}
              </span>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="subjectId">Asignatura</Label>
              <select
                id="subjectId"
                {...form.register("subjectId")}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <option value="">(Sin asignatura)</option>
                {mockSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type">Tipo</Label>
              <select
                id="type"
                {...form.register("type")}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                {(Object.keys(eventTypeLabels) as EventType[]).map((k) => (
                  <option key={k} value={k}>
                    {eventTypeLabels[k]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="source">Origen</Label>
              <select
                id="source"
                {...form.register("source")}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                {(Object.keys(eventSourceLabels) as EventSource[]).map((k) => (
                  <option key={k} value={k}>
                    {eventSourceLabels[k]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="location">Lugar</Label>
              <Input id="location" placeholder="Aula, edificio…" {...form.register("location")} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Inicio</Label>
              <div className="flex gap-2">
                <Input type="date" {...form.register("startDate")} />
                <Input type="time" {...form.register("startTime")} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Fin</Label>
              <div className="flex gap-2">
                <Input type="date" {...form.register("endDate")} />
                <Input type="time" {...form.register("endTime")} />
              </div>
              {form.formState.errors.endTime && (
                <span className="text-xs text-destructive">
                  {form.formState.errors.endTime.message}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Descripción</Label>
            <textarea
              id="description"
              {...form.register("description")}
              rows={3}
              className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>

          <DialogFooter className="sm:justify-between">
            <div>
              {event && (
                <Button type="button" variant="destructive" onClick={handleDelete}>
                  Eliminar
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">{event ? "Guardar" : "Crear"}</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
