import { FileText, FileType, Image as ImageIcon, Notebook } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

import type { ResourceKind } from "./types";

const iconMap = {
  pdf: FileType,
  image: ImageIcon,
  text: FileText,
  markdown: Notebook,
} as const;

interface ResourceIconProps extends ComponentProps<"span"> {
  kind: ResourceKind;
}

export function ResourceIcon({ kind, className, ...props }: ResourceIconProps) {
  const Icon = iconMap[kind];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary",
        className,
      )}
      {...props}
    >
      <Icon className="h-5 w-5" />
    </span>
  );
}
