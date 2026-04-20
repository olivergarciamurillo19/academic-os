"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useResource, useResourceActions } from "./resource-store";
import type { ResourceRecord } from "./types";

interface ResourceViewerProps {
  resourceId: string;
}

export function ResourceViewer({ resourceId }: ResourceViewerProps) {
  const resource = useResource(resourceId);
  const { blobUrlFor } = useResourceActions();
  const [blobUrl, setBlobUrl] = useState<string | undefined>();

  useEffect(() => {
    setBlobUrl(blobUrlFor(resourceId));
  }, [resourceId, blobUrlFor]);

  if (!resource) {
    return (
      <div className="rounded-xl border p-6 text-sm text-muted-foreground">
        Recurso no encontrado. Puede que se haya eliminado o que la pestaña se haya reiniciado
        (los blobs de mock viven solo durante la sesión).
      </div>
    );
  }

  if (!blobUrl) {
    return (
      <MockPlaceholder resource={resource} reason="blob-expired" />
    );
  }

  if (resource.kind === "pdf") {
    return <PdfViewer resource={resource} url={blobUrl} />;
  }
  if (resource.kind === "image") {
    return <ImageViewer resource={resource} url={blobUrl} />;
  }
  return <TextViewer resource={resource} url={blobUrl} />;
}

function PdfViewer({ resource, url }: { resource: ResourceRecord; url: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">PDF nativo · {resource.name}</span>
        <Button asChild size="sm" variant="secondary">
          <a href={url} download={resource.name}>
            Descargar
          </a>
        </Button>
      </div>
      <iframe
        title={resource.name}
        src={url}
        className="h-[72vh] w-full rounded-lg border bg-card"
      />
      {/* TODO(ui): upgrade to react-pdf for pagination + text layer once real
          storage is wired; the native browser viewer is sufficient for V1 mock. */}
    </div>
  );
}

function ImageViewer({ resource, url }: { resource: ResourceRecord; url: string }) {
  const [full, setFull] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{resource.name}</span>
        <Button size="sm" variant="secondary" onClick={() => setFull((v) => !v)}>
          {full ? <Minimize2 className="mr-2 h-4 w-4" /> : <Maximize2 className="mr-2 h-4 w-4" />}
          {full ? "Salir pantalla completa" : "Pantalla completa"}
        </Button>
      </div>
      <div
        className={cn(
          "overflow-hidden rounded-lg border bg-card",
          full && "fixed inset-0 z-50 m-0 flex items-center justify-center rounded-none bg-background/95 p-4",
        )}
      >
        {/* Using plain <img> because next/image requires known hosts/local paths, not blob:. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={resource.name}
          className={cn("mx-auto block max-w-full", full ? "max-h-full object-contain" : "")}
        />
      </div>
    </div>
  );
}

function TextViewer({ resource, url }: { resource: ResourceRecord; url: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then((r) => r.text())
      .then((t) => {
        if (!cancelled) setContent(t);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error leyendo archivo");
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (error) {
    return <div className="rounded-xl border p-4 text-sm text-destructive">{error}</div>;
  }
  if (content === null) {
    return (
      <div className="rounded-xl border p-4 text-sm text-muted-foreground">
        Cargando {resource.name}…
      </div>
    );
  }

  if (resource.kind === "markdown") {
    return (
      <article className="prose prose-sm max-w-none rounded-xl border bg-card p-6 dark:prose-invert">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </article>
    );
  }

  return (
    <pre className="overflow-x-auto rounded-xl border bg-card p-4 text-xs leading-relaxed">
      {content}
    </pre>
  );
}

function MockPlaceholder({
  resource,
  reason,
}: {
  resource: ResourceRecord;
  reason: "blob-expired";
}) {
  const message =
    reason === "blob-expired"
      ? "Este recurso se subió durante una sesión anterior; el blob solo vive mientras la pestaña está abierta."
      : "Vista no disponible.";
  return (
    <div className="flex flex-col gap-2 rounded-xl border p-6">
      <span className="text-sm font-medium">{resource.name}</span>
      <p className="text-sm text-muted-foreground">{message}</p>
      <p className="text-xs text-muted-foreground">
        El render real llegará cuando Armando exponga URLs firmadas desde Supabase Storage.
      </p>
    </div>
  );
}
