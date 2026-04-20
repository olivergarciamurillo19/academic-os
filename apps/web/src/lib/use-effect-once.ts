"use client";

import { useEffect, useRef } from "react";

/** Run an effect exactly once on mount (StrictMode-safe). */
export function useEffectOnce(effect: () => void | (() => void)): void {
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const cleanup = effect();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
