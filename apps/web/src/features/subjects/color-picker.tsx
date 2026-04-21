"use client";

import { Check, Palette } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateSubjectColor } from "@/actions/subjects";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SUBJECT_COLOR_SWATCHES } from "@/features/appearance/tokens";
import { cn } from "@/lib/utils";


interface SubjectColorPickerProps {
  subjectId: string;
  current: string;
}

export function SubjectColorPicker({ subjectId, current }: SubjectColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(current);
  const [pending, startTransition] = useTransition();

  function pick(color: string) {
    setPreview(color);
    startTransition(async () => {
      const res = await updateSubjectColor({ subjectId, color });
      if (res.ok) {
        toast.success("Color actualizado");
      } else {
        toast.error(res.message);
        setPreview(current);
      }
      setOpen(false);
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          aria-label="Cambiar color de la asignatura"
          disabled={pending}
        >
          <span
            aria-hidden="true"
            className="h-3 w-3 rounded-full border"
            style={{ backgroundColor: preview }}
          />
          <Palette className="h-3.5 w-3.5" />
          Color
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Color de la asignatura
        </p>
        <div className="grid grid-cols-6 gap-2">
          {SUBJECT_COLOR_SWATCHES.map((color) => {
            const active = color.toLowerCase() === preview.toLowerCase();
            return (
              <button
                key={color}
                type="button"
                onClick={() => pick(color)}
                aria-label={color}
                aria-pressed={active}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-offset-2",
                  active && "ring-2 ring-offset-2",
                )}
                style={{ backgroundColor: color, color: "#fff" }}
              >
                {active ? <Check className="h-3.5 w-3.5" /> : null}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
