"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { getBrowserQueryClient } from "@/lib/query-client";

export function QueryProvider({ children }: { children: ReactNode }) {
  const client = getBrowserQueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
