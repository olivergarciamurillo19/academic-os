import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "Bienvenido",
};

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-xl items-center justify-between px-6 pt-8">
        <Logo size="sm" />
        <span className="text-xs text-muted-foreground">v0 · UAL</span>
      </header>
      <main className="mx-auto flex max-w-xl flex-col gap-8 px-6 pb-16 pt-10">{children}</main>
    </div>
  );
}
