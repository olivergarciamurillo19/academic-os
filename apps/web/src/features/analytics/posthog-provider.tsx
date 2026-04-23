"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, type ReactNode } from "react";

import { pageview } from "@/lib/analytics";

function Tracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    pageview(pathname, searchParams.toString() ? `?${searchParams.toString()}` : "");
  }, [pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Suspense fallback={null}>
        <Tracker />
      </Suspense>
    </>
  );
}
