"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createEvent as createEventAction,
  deleteEvent as deleteEventAction,
  listEvents as listEventsAction,
  updateEvent as updateEventAction,
  type UpsertEventInput,
} from "@/actions/events";

import type { CalendarEvent } from "./types";

export const eventsKey = ["events"] as const;

export function useCalendarEvents(): CalendarEvent[] {
  const q = useQuery({
    queryKey: eventsKey,
    queryFn: () => listEventsAction(),
    staleTime: 30_000,
    initialData: [],
  });
  return q.data;
}

function apply(
  qc: QueryClient,
  updater: (prev: CalendarEvent[]) => CalendarEvent[],
): CalendarEvent[] {
  const prev = qc.getQueryData<CalendarEvent[]>(eventsKey) ?? [];
  qc.setQueryData<CalendarEvent[]>(eventsKey, updater(prev));
  return prev;
}

export function useCalendarActions(): {
  upsert: (event: CalendarEvent) => Promise<void>;
  remove: (id: string) => Promise<void>;
} {
  const qc = useQueryClient();

  const createMut = useMutation({
    mutationFn: async (input: UpsertEventInput) => createEventAction(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: eventsKey });
      const optimistic: CalendarEvent = {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `tmp_${Math.random().toString(36).slice(2)}`,
        subjectId: input.subjectId ?? null,
        title: input.title,
        description: input.description ?? undefined,
        startISO: input.startISO,
        endISO: input.endISO,
        location: input.location ?? undefined,
        source: "manual",
        type: input.type,
        allDay: input.allDay,
      };
      const prev = apply(qc, (list) => [...list, optimistic]);
      return { prev, tempId: optimistic.id };
    },
    onError: (err, _input, ctx) => {
      if (ctx?.prev) qc.setQueryData(eventsKey, ctx.prev);
      toast.error(err instanceof Error ? err.message : "No se pudo crear el evento");
    },
    onSuccess: (real, _input, ctx) => {
      qc.setQueryData<CalendarEvent[]>(eventsKey, (list) =>
        (list ?? []).map((e) => (e.id === ctx?.tempId ? real : e)),
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: eventsKey }),
  });

  const updateMut = useMutation({
    mutationFn: async (input: UpsertEventInput & { id: string }) =>
      updateEventAction(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: eventsKey });
      const prev = apply(qc, (list) =>
        list.map((e) =>
          e.id === input.id
            ? {
                ...e,
                subjectId: input.subjectId ?? null,
                title: input.title,
                description: input.description ?? undefined,
                startISO: input.startISO,
                endISO: input.endISO,
                location: input.location ?? undefined,
                type: input.type,
                allDay: input.allDay,
              }
            : e,
        ),
      );
      return { prev };
    },
    onError: (err, _input, ctx) => {
      if (ctx?.prev) qc.setQueryData(eventsKey, ctx.prev);
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar el evento");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: eventsKey }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => deleteEventAction(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: eventsKey });
      const prev = apply(qc, (list) => list.filter((e) => e.id !== id));
      return { prev };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(eventsKey, ctx.prev);
      toast.error(err instanceof Error ? err.message : "No se pudo borrar");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: eventsKey }),
  });

  return {
    upsert: async (event) => {
      const payload: UpsertEventInput = {
        subjectId: event.subjectId ?? null,
        title: event.title,
        description: event.description ?? null,
        startISO: event.startISO,
        endISO: event.endISO,
        location: event.location ?? null,
        type: event.type,
        allDay: event.allDay ?? false,
      };
      const isExisting =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          event.id,
        ) &&
        (qc.getQueryData<CalendarEvent[]>(eventsKey) ?? []).some(
          (e) => e.id === event.id,
        );
      if (isExisting) {
        await updateMut.mutateAsync({ ...payload, id: event.id });
      } else {
        await createMut.mutateAsync(payload);
      }
    },
    remove: async (id) => {
      await deleteMut.mutateAsync(id);
    },
  };
}

export function newEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `evt_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}
