"use client";

import { useQuery } from "@tanstack/react-query";

import { getSubjects, type UiSubject } from "@/actions/subjects";

export const subjectsKey = ["subjects"] as const;

export function useSubjectsForActiveUser(): UiSubject[] {
  const q = useQuery({
    queryKey: subjectsKey,
    queryFn: () => getSubjects(),
    staleTime: 5 * 60_000,
    initialData: [],
  });
  return q.data;
}

export function useSubjectById(id: string | null | undefined): UiSubject | null {
  const list = useSubjectsForActiveUser();
  if (!id) return null;
  return list.find((s) => s.id === id) ?? null;
}
