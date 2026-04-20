import "dotenv/config";
import { db, client } from "../client.js";
import {
  universities,
  degreePrograms,
  cohorts,
  subjects,
  topics,
} from "../schema/index.js";

// ─── UAL Master Data ─────────────────────────────────────────────────────────
// Source: UAL Campus Virtual — Guías docentes Grado Ingeniería Mecánica 2025/26

const UAL = {
  slug: "ual",
  name: "Universidad de Almería",
  country: "ES",
  locale: "es-ES",
} as const;

const DEGREES = [
  { code: "441", name: "Grado en Ingeniería Mecánica", kind: "bachelor" as const },
  { code: "442", name: "Grado en Ingeniería Electrónica Industrial", kind: "bachelor" as const },
] as const;

// Real subject codes from UAL degree plan
// 1Q = primer cuatrimestre, 2Q = segundo cuatrimestre
const MECÁNICA_1Q = [
  { code: "44101101", name: "Matemáticas I",                       credits: 6, semester: 1, color: "#10B981" },
  { code: "44101105", name: "Física I",                            credits: 6, semester: 1, color: "#EF4444" },
  { code: "44101108", name: "Química",                             credits: 6, semester: 1, color: "#8B5CF6" },
  { code: "44101109", name: "Expresión Gráfica",                   credits: 6, semester: 1, color: "#3B82F6" },
  { code: "44101110", name: "Organización y Gestión de Empresas",  credits: 6, semester: 1, color: "#F59E0B" },
] as const;

const MECÁNICA_2Q = [
  { code: "44101102", name: "Matemáticas II",          credits: 6, semester: 2, color: "#14B8A6" },
  { code: "44101103", name: "Estadística",             credits: 6, semester: 2, color: "#EC4899" },
  { code: "44101106", name: "Física II",               credits: 6, semester: 2, color: "#F97316" },
  { code: "44101107", name: "Programación",            credits: 6, semester: 2, color: "#6366F1" },
  { code: "44103226", name: "Tecnología de la Fabricación", credits: 6, semester: 2, color: "#84CC16" },
] as const;

// 5 generic topics per subject used as placeholders until professors add real content
function genericTopics(
  subjectId: string,
  subjectName: string,
): Array<{ subjectId: string; orderIndex: number; name: string; kind: "theory" | "practice" }> {
  return [
    { subjectId, orderIndex: 1, name: `${subjectName} — Tema 1: Introducción`, kind: "theory" },
    { subjectId, orderIndex: 2, name: `${subjectName} — Tema 2: Fundamentos`, kind: "theory" },
    { subjectId, orderIndex: 3, name: `${subjectName} — Tema 3: Desarrollo`, kind: "theory" },
    { subjectId, orderIndex: 4, name: `${subjectName} — Prácticas de laboratorio`, kind: "practice" },
    { subjectId, orderIndex: 5, name: `${subjectName} — Tema 4: Aplicaciones`, kind: "theory" },
  ];
}

async function seed(): Promise<void> {
  console.log("🌱 UAL seed — start");

  // 1. University
  const [university] = await db
    .insert(universities)
    .values(UAL)
    .onConflictDoUpdate({
      target: universities.slug,
      set: { name: UAL.name, country: UAL.country, locale: UAL.locale },
    })
    .returning();
  if (!university) throw new Error("Failed to upsert university");
  console.log(`  ✓ University: ${university.name}`);

  // 2. Degree programs
  const insertedDegrees = await db
    .insert(degreePrograms)
    .values(DEGREES.map((d) => ({ ...d, universityId: university.id })))
    .onConflictDoUpdate({
      target: [degreePrograms.universityId, degreePrograms.code],
      set: { name: degreePrograms.name, kind: degreePrograms.kind },
    })
    .returning();
  console.log(`  ✓ Degrees: ${insertedDegrees.map((d) => d.code).join(", ")}`);

  // 3. Cohorts: 2025/26 · 1Q & 2Q for each degree
  const cohortRows = insertedDegrees.flatMap((deg) => [
    { degreeProgramId: deg.id, academicYear: "2025/26", period: "1Q", groupCode: "A" },
    { degreeProgramId: deg.id, academicYear: "2025/26", period: "2Q", groupCode: "A" },
  ]);

  const insertedCohorts = await db
    .insert(cohorts)
    .values(cohortRows)
    .onConflictDoUpdate({
      target: [cohorts.degreeProgramId, cohorts.academicYear, cohorts.period, cohorts.groupCode],
      set: { academicYear: cohorts.academicYear },
    })
    .returning();
  console.log(`  ✓ Cohorts: ${insertedCohorts.length}`);

  // 4. Subjects for Grado Ingeniería Mecánica (code "441")
  const mecánica = insertedDegrees.find((d) => d.code === "441");
  if (!mecánica) throw new Error("Mecánica degree not found");

  const cohort1Q = insertedCohorts.find((c) => c.degreeProgramId === mecánica.id && c.period === "1Q");
  const cohort2Q = insertedCohorts.find((c) => c.degreeProgramId === mecánica.id && c.period === "2Q");
  if (!cohort1Q || !cohort2Q) throw new Error("Cohorts not found");

  const subjectRows = [
    ...MECÁNICA_1Q.map((s) => ({ ...s, cohortId: cohort1Q.id, universityId: university.id })),
    ...MECÁNICA_2Q.map((s) => ({ ...s, cohortId: cohort2Q.id, universityId: university.id })),
  ];

  const insertedSubjects = await db
    .insert(subjects)
    .values(subjectRows)
    .onConflictDoUpdate({
      target: [subjects.cohortId, subjects.code],
      set: { name: subjects.name, credits: subjects.credits, color: subjects.color },
    })
    .returning();
  console.log(`  ✓ Subjects: ${insertedSubjects.length} (${insertedSubjects.map((s) => s.code).join(", ")})`);

  // 5. Generic topics for each subject (5 per subject)
  const topicRows = insertedSubjects.flatMap((s) => genericTopics(s.id, s.name));

  // Upsert topics: delete existing first for idempotency, then insert fresh
  for (const sub of insertedSubjects) {
    const existing = await db.query.topics.findMany({
      where: (t, { eq }) => eq(t.subjectId, sub.id),
    });
    if (existing.length > 0) continue; // already seeded

    const rows = genericTopics(sub.id, sub.name);
    await db.insert(topics).values(rows);
  }
  console.log(`  ✓ Topics: ${topicRows.length} (5 per subject)`);

  console.log("✅ UAL seed complete.");
}

seed()
  .then(() => client.end())
  .catch((err: unknown) => {
    console.error("❌ Seed failed:", err);
    void client.end();
    process.exit(1);
  });
