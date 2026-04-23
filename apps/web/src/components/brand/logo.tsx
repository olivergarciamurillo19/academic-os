import { type ComponentProps } from "react";

import { cn } from "@/lib/utils";

type LogoProps = ComponentProps<"div"> & {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
};

const sizeMap = {
  sm: { mark: "h-6 w-6", text: "text-sm", gap: "gap-2" },
  md: { mark: "h-8 w-8", text: "text-base", gap: "gap-2.5" },
  lg: { mark: "h-10 w-10", text: "text-lg", gap: "gap-3" },
} as const;

export function Logo({
  className,
  size = "md",
  showWordmark = true,
  ...props
}: LogoProps) {
  const s = sizeMap[size];
  return (
    <div className={cn("inline-flex items-center", s.gap, className)} {...props}>
      <LogoMark className={s.mark} />
      {showWordmark && (
        <span className={cn("font-semibold tracking-tight", s.text)}>
          Academic<span className="text-primary">OS</span>
        </span>
      )}
    </div>
  );
}

type LogoMarkProps = ComponentProps<"svg">;

export function LogoMark({ className, ...props }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="Academic OS"
      className={cn("text-primary", className)}
      {...props}
    >
      <rect x="2" y="2" width="28" height="28" rx="8" fill="currentColor" />
      <path
        d="M10.5 21.5V12.5L16 9L21.5 12.5V21.5"
        stroke="var(--color-primary-foreground)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 16.5H21.5"
        stroke="var(--color-primary-foreground)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
