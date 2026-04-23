"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";

import {
  deleteResource as deleteResourceAction,
  listResourcesForSubject,
} from "./actions";
import type { ResourceRecord, TopicKind } from "./types";

const blobUrlCache = new Map<string, string>();

const listKey = (subjectId: string) => ["resources", subjectId] as const;

type DocStatus = "pending" | "processing" | "indexed" | "failed" | null;

interface UiResourceRecord extends ResourceRecord {
  documentStatus?: DocStatus;
}

/**
 * Lists resources owned by the caller for a subject. `topicKind` is a UI
 * hint; the DB doesn't yet partition by topic kind, so filtering here is a
 * no-op but the param is kept for consumer API stability.
 */
export function useResources(subjectId: string, topicKind?: TopicKind): ResourceRecord[] {
  const q = useQuery({
    queryKey: listKey(subjectId),
    queryFn: () => listResourcesForSubject(subjectId),
    staleTime: 30_000,
    initialData: [],
    enabled: Boolean(subjectId),
    // Poll while any document in the list is still being indexed so the
    // "indexado" badge updates without a manual refresh.
    refetchInterval: (q) => {
      const data = q.state.data;
      const inFlight = (data ?? []).some(
        (r) =>
          r.documentStatus === "pending" || r.documentStatus === "processing",
      );
      return inFlight ? 5_000 : false;
    },
  });
  const rows = q.data as UiResourceRecord[];
  return topicKind ? rows.filter((r) => r.topicKind === topicKind || true) : rows;
}

export function useResource(resourceId: string): ResourceRecord | null {
  // Walk every cached subject list — cheaper than a dedicated query.
  const qc = useQueryClient();
  const all = qc.getQueriesData<ResourceRecord[]>({ queryKey: ["resources"] });
  for (const [, list] of all) {
    const hit = (list ?? []).find((r) => r.id === resourceId);
    if (hit) return hit;
  }
  return null;
}

export function useResourceActions(): {
  addResource: (record: ResourceRecord, file?: File) => void;
  removeResource: (resourceId: string) => Promise<void>;
  blobUrlFor: (resourceId: string) => string | undefined;
} {
  const qc = useQueryClient();

  const removeMut = useMutation({
    mutationFn: async (resourceId: string) => deleteResourceAction(resourceId),
    onMutate: (resourceId) => {
      const keys = qc.getQueriesData<ResourceRecord[]>({ queryKey: ["resources"] });
      const rollback = keys.map(([key, list]) => {
        qc.setQueryData(
          key,
          (list ?? []).filter((r) => r.id !== resourceId),
        );
        return { key, list } as const;
      });
      return { rollback };
    },
    onError: (err, _id, ctx) => {
      ctx?.rollback.forEach(({ key, list }) => qc.setQueryData(key, list));
      toast.error(err instanceof Error ? err.message : "No se pudo borrar el recurso");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["resources"] }),
  });

  const addResource = useCallback(
    (record: ResourceRecord, file?: File) => {
      if (file) {
        const url = URL.createObjectURL(file);
        blobUrlCache.set(record.id, url);
      }
      // Prepend optimistically to every cached subject list that matches.
      qc.setQueryData<ResourceRecord[]>(listKey(record.subjectId), (prev) => [
        record,
        ...(prev ?? []),
      ]);
      // Invalidate to fetch documentStatus from DB shortly after.
      void qc.invalidateQueries({ queryKey: listKey(record.subjectId) });
    },
    [qc],
  );

  const removeResource = useCallback(
    async (resourceId: string) => {
      const cached = blobUrlCache.get(resourceId);
      if (cached) {
        URL.revokeObjectURL(cached);
        blobUrlCache.delete(resourceId);
      }
      const res = await removeMut.mutateAsync(resourceId);
      if (!res.ok) {
        toast.error(res.message);
      }
    },
    [removeMut],
  );

  const blobUrlFor = useCallback(
    (resourceId: string) => blobUrlCache.get(resourceId),
    [],
  );

  return { addResource, removeResource, blobUrlFor };
}
