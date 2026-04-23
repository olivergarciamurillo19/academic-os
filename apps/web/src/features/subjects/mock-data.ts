/**
 * UAL 1º Grado Ingeniería Mecánica — asignaturas reales.
 * Source of truth: packages/db/src/seed/ual.ts (Armando).
 * This is a frontend-only mock; will be replaced by Drizzle queries
 * once the backend `/api/subjects` endpoint and Supabase Auth land.
 */

export type SubjectSemester = "1Q" | "2Q";

export interface MockSubject {
  id: string;
  code: string;
  name: string;
  shortName: string;
  credits: number;
  semester: SubjectSemester;
  /** Index into --color-subject-{1..10} palette. */
  colorIndex: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  /** Hex color stored in subjects.color (overrides colorIndex when present). */
  color?: string;
  /** Mock next event — placeholder until calendar sync is wired. */
  nextEvent?: {
    label: string;
    whenISO: string;
  };
}

export const mockDegree = {
  id: "441",
  name: "Grado en Ingeniería Mecánica",
  universityShort: "UAL",
  universityName: "Universidad de Almería",
} as const;

export const mockSubjects: readonly MockSubject[] = [
  {
    id: "44101101",
    code: "44101101",
    name: "Expresión Gráfica",
    shortName: "Ex. Gráfica",
    credits: 6,
    semester: "1Q",
    colorIndex: 1,
    nextEvent: { label: "Clase magistral", whenISO: "2026-04-21T09:00:00+02:00" },
  },
  {
    id: "44101201",
    code: "44101201",
    name: "Física I",
    shortName: "Física I",
    credits: 6,
    semester: "1Q",
    colorIndex: 7,
    nextEvent: { label: "Práctica de laboratorio", whenISO: "2026-04-22T11:00:00+02:00" },
  },
  {
    id: "44101301",
    code: "44101301",
    name: "Matemáticas I",
    shortName: "Mates I",
    credits: 6,
    semester: "1Q",
    colorIndex: 3,
    nextEvent: { label: "Examen parcial", whenISO: "2026-05-02T10:00:00+02:00" },
  },
  {
    id: "44101401",
    code: "44101401",
    name: "Organización y Gestión de Empresas",
    shortName: "Org. Empresas",
    credits: 6,
    semester: "1Q",
    colorIndex: 5,
    nextEvent: { label: "Entrega de caso", whenISO: "2026-04-28T23:59:00+02:00" },
  },
  {
    id: "44101501",
    code: "44101501",
    name: "Química",
    shortName: "Química",
    credits: 6,
    semester: "1Q",
    colorIndex: 9,
    nextEvent: { label: "Seminario", whenISO: "2026-04-23T16:00:00+02:00" },
  },
  {
    id: "44102101",
    code: "44102101",
    name: "Estadística",
    shortName: "Estadística",
    credits: 6,
    semester: "2Q",
    colorIndex: 8,
    nextEvent: { label: "Problemas", whenISO: "2026-04-24T12:00:00+02:00" },
  },
  {
    id: "44102201",
    code: "44102201",
    name: "Física II",
    shortName: "Física II",
    credits: 6,
    semester: "2Q",
    colorIndex: 6,
    nextEvent: { label: "Teoría", whenISO: "2026-04-21T12:00:00+02:00" },
  },
  {
    id: "44102301",
    code: "44102301",
    name: "Matemáticas II",
    shortName: "Mates II",
    credits: 6,
    semester: "2Q",
    colorIndex: 4,
    nextEvent: { label: "Clase práctica", whenISO: "2026-04-22T09:00:00+02:00" },
  },
  {
    id: "44103101",
    code: "44103101",
    name: "Programación",
    shortName: "Programación",
    credits: 6,
    semester: "2Q",
    colorIndex: 10,
    nextEvent: { label: "Práctica en lab", whenISO: "2026-04-24T09:00:00+02:00" },
  },
  {
    id: "44103226",
    code: "44103226",
    name: "Tecnología de la Fabricación",
    shortName: "Tec. Fabricación",
    credits: 6,
    semester: "2Q",
    colorIndex: 2,
    nextEvent: { label: "Taller práctico", whenISO: "2026-04-25T10:00:00+02:00" },
  },
] as const;

export function getSubjectById(id: string): MockSubject | undefined {
  return mockSubjects.find((s) => s.id === id);
}

/**
 * Current academic quarter for preselecting filters in UI.
 * Rule of thumb: Feb–Jun ≈ 2Q, Sep–Jan ≈ 1Q.
 */
export function getCurrentSemester(now: Date = new Date()): SubjectSemester {
  const month = now.getMonth(); // 0-indexed
  return month >= 1 && month <= 5 ? "2Q" : "1Q";
}

export function subjectColorVar(index: MockSubject["colorIndex"]): string {
  return `var(--color-subject-${index})`;
}

export function subjectColorForegroundVar(index: MockSubject["colorIndex"]): string {
  return `var(--color-subject-${index}-foreground)`;
}
