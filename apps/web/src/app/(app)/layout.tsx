import type { ReactNode } from "react";

import { BottomNav } from "@/features/shell/bottom-nav";
import { LeftRail } from "@/features/shell/left-rail";
import { MobileFab } from "@/features/shell/mobile-fab";
import { QueryProvider } from "@/features/shell/query-provider";
import { TopBar } from "@/features/shell/top-bar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <div className="min-h-screen bg-background text-foreground">
        <TopBar />
        <div className="flex">
          <LeftRail />
          <main
            id="main"
            className="min-w-0 flex-1 pb-24 lg:pb-8"
            aria-label="Contenido principal"
          >
            {children}
          </main>
        </div>
        <BottomNav />
        <MobileFab />
      </div>
    </QueryProvider>
  );
}
