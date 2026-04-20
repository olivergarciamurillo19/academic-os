"use client";

import { FileX } from "lucide-react";
import { useState } from "react";

import { LoadingSkeleton } from "@/components/brand/loading-skeleton";
import { useEffectOnce } from "@/lib/use-effect-once";

import { ResourceCard } from "./resource-card";
import { useResources } from "./resource-store";
import type { TopicKind } from "./types";

interface ResourceListProps {
  subjectId: string;
  topicKind: TopicKind;
}

export function ResourceList({ subjectId, topicKind }: ResourceListProps) {
  const [mounted, setMounted] = useState(false);
  useEffectOnce(() => setMounted(true));

  const resources = useResources(subjectId, topicKind);

  if (!mounted) {
    return <LoadingSkeleton variant="list" lines={3} />;
  }

  if (resources.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <FileX className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="text-sm font-medium">Sin recursos todavía</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Sube apuntes, ejercicios o enunciados y los tendrás siempre a mano.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {resources.map((r) => (
        <li key={r.id}>
          <ResourceCard resource={r} />
        </li>
      ))}
    </ul>
  );
}
