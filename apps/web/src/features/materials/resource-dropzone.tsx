"use client";

import { CloudUpload, FileUp } from "lucide-react";
import { useCallback, useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { uploadResource } from "./actions";
import { useResourceActions } from "./resource-store";
import {
  ACCEPT_ATTRIBUTE,
  MAX_RESOURCE_BYTES,
  formatBytes,
  type TopicKind,
} from "./types";

interface ResourceDropzoneProps {
  subjectId: string;
  topicKind: TopicKind;
}

interface ActiveUpload {
  id: string;
  name: string;
  sizeBytes: number;
  progress: number;
  status: "uploading" | "error";
  errorMessage?: string;
}

export function ResourceDropzone({ subjectId, topicKind }: ResourceDropzoneProps) {
  const { addResource } = useResourceActions();
  const [isDragging, setIsDragging] = useState(false);
  const [active, setActive] = useState<ActiveUpload[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      for (const file of Array.from(files)) {
        const tempId = `${file.name}-${file.size}-${Date.now()}`;
        setActive((prev) => [
          ...prev,
          {
            id: tempId,
            name: file.name,
            sizeBytes: file.size,
            progress: 8,
            status: "uploading",
          },
        ]);

        try {
          await animateProgress(tempId, setActive);
          const fd = new FormData();
          fd.set("subjectId", subjectId);
          fd.set("topicKind", topicKind);
          fd.set("file", file);
          const result = await uploadResource(fd);

          if (!result.ok) {
            setActive((prev) =>
              prev.map((u) =>
                u.id === tempId
                  ? { ...u, status: "error", errorMessage: result.message, progress: 100 }
                  : u,
              ),
            );
            toast.error(result.message);
            continue;
          }

          addResource(result.record, file);
          setActive((prev) => prev.filter((u) => u.id !== tempId));
          toast.success(`Subido: ${file.name}`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Error desconocido";
          setActive((prev) =>
            prev.map((u) =>
              u.id === tempId
                ? { ...u, status: "error", errorMessage: msg, progress: 100 }
                : u,
            ),
          );
          toast.error(msg);
        }
      }
    },
    [addResource, subjectId, topicKind],
  );

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    void handleFiles(e.dataTransfer.files);
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5 text-foreground"
            : "border-muted-foreground/30 hover:border-muted-foreground/50",
        )}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CloudUpload className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium">Arrastra archivos aquí o pulsa para subir</p>
          <p className="text-xs text-muted-foreground">
            PDF, PNG, JPG, HEIC, TXT, MD · máx {formatBytes(MAX_RESOURCE_BYTES)} cada uno
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => inputRef.current?.click()}
        >
          <FileUp className="mr-2 h-4 w-4" />
          Subir
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          className="sr-only"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {active.length > 0 && (
        <ul className="flex flex-col gap-2">
          {active.map((u) => (
            <li key={u.id} className="flex flex-col gap-1 rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{u.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatBytes(u.sizeBytes)}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width]",
                    u.status === "error" ? "bg-destructive" : "bg-primary",
                  )}
                  style={{ width: `${u.progress}%` }}
                />
              </div>
              {u.status === "error" && (
                <span className="text-xs text-destructive">{u.errorMessage}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function animateProgress(
  id: string,
  setActive: React.Dispatch<React.SetStateAction<ActiveUpload[]>>,
): Promise<void> {
  return new Promise((resolve) => {
    let pct = 8;
    const tick = () => {
      pct = Math.min(95, pct + Math.random() * 18 + 6);
      setActive((prev) => prev.map((u) => (u.id === id ? { ...u, progress: pct } : u)));
      if (pct >= 95) {
        resolve();
      } else {
        setTimeout(tick, 120);
      }
    };
    setTimeout(tick, 120);
  });
}
