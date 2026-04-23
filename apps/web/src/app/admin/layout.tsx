import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { BottomNav } from "@/features/shell/bottom-nav";
import { LeftRail } from "@/features/shell/left-rail";
import { TopBar } from "@/features/shell/top-bar";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSessionUser();
  if (!session || session.activeMembership?.role !== "admin") {
    // 404 instead of 403 so admin routes are invisible to non-admins.
    notFound();
  }

  return (
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
    </div>
  );
}
