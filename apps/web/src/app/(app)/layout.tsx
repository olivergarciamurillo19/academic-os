import type { ReactNode } from "react";

import { getAppearance } from "@/actions/preferences";
import { AppearanceProvider } from "@/features/appearance/appearance-provider";
import {
  ACCENT_TOKENS,
  DENSITY_FONT_SIZE,
  FONT_STACKS,
} from "@/features/appearance/tokens";
import { BottomNav } from "@/features/shell/bottom-nav";
import { LeftRail } from "@/features/shell/left-rail";
import { MobileFab } from "@/features/shell/mobile-fab";
import { QueryProvider } from "@/features/shell/query-provider";
import { TopBar } from "@/features/shell/top-bar";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const appearance = await getAppearance();
  const tokens = ACCENT_TOKENS[appearance.accentColor];
  const inlineStyle = {
    "--color-primary": tokens.primary,
    "--color-primary-foreground": tokens.primaryForeground,
    "--color-ring": tokens.ring,
    "--app-font-sans": FONT_STACKS[appearance.font],
    "--app-font-size": DENSITY_FONT_SIZE[appearance.density],
  } as React.CSSProperties;
  return (
    <QueryProvider>
      <AppearanceProvider initial={appearance}>
        <div
          className="min-h-screen bg-background text-foreground"
          style={inlineStyle}
          data-accent={appearance.accentColor}
          data-font={appearance.font}
          data-density={appearance.density}
        >
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
      </AppearanceProvider>
    </QueryProvider>
  );
}
