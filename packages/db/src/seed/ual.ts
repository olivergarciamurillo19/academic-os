import "dotenv/config";
import { db, client } from "../client.js";
import {
  universities,
  degreePrograms,
  cohorts,
  subjects,
} from "../schema/index.js";

// ─── UAL Seed Data ────────────────────────────────────────────────────────────
// Source: UAL Campus Virtual — Grado Ingeniería Mecánica e Industrial, curso 2025/26

const UAL_UNIVERSITY = {
  slug: "ual",
  name: "Universidad de Almería",
  country: "ES",
  locale: "es-ES",
} as const;

const DEGREE_PROGRAMS = [
  {
    code: "441",
    name: "Grado en Ingeniería Mecánica",
    kind: "bachelor" as const,
  },
  {
    code: "442",
    name: "Grado en Ingeniería Electrónica Industrial",
    kind: "bachelor" as const,
  },
] as const;

// Asignaturas reales de 1º de Grado en Ingeniería Mecánica UAL
// Código oficial UAL (7 dígitos): 4410XXXX
const SUBJECTS_1Q = [
  { code: "44101101", name: "Expresión Gráfica", credits: 6, semester: 1, color: "#3B82F6" },
  { code: "44101201", name: "Física I", credits: 6, semester: 1, color: "#EF4444" },
  { code: "44101301", name: "Matemáticas I", credits: 6, semester: 1, color: "#10B981" },
  {
    code: "44101401",
    name: "Organización y Gestión de Empresas",
    credits: 6,
    semester: 1,
    color: "#F59E0B",
  },
  { code: "44101501", name: "Química", credits: 6, semester: 1, color: "#8B5CF6" },
] as const;

const SUBJECTS_2Q = [
  { code: "44102101", name: "Estadística", credits: 6, semester: 2, color: "#EC4899" },
  { code: "44102201", name: "Física II", credits: 6, semester: 2, color: "#F97316" },
  { code: "44102301", name: "Matemáticas II", credits: 6, semester: 2, color: "#14B8A6" },
  { code: "44103101", name: "Programación", credits: 6, semester: 2, color: "#6366F1" },
  {
    code: "44103226",
    name: "Tecnología de la Fabricación",
    credits: 6,
    semester: 2,
    color: "#84CC16",
  },
] as const;

async function seed(): Promise<void> {
  console.log("🌱 Seeding UAL data...");

  // 1. Insert university
  const [university] = await db
    .insert(universities)
    .values(UAL_UNIVERSITY)
    .onConflictDoUpdate({
      target: universities.slug,
      set: {
        name: UAL_UNIVERSITY.name,
        country: UAL_UNIVERSITY.country,
        locale: UAL_UNIVERSITY.locale,
      },
    })
    .returning();

  if (!university) throw new Error("Failed to upsert university");
  console.log(`  ✓ University: ${university.name} (${university.id})`);

  // 2. Insert degree programs
  const insertedDegrees = await db
    .insert(degreePrograms)
    .values(
      DEGREE_PROGRAMS.map((d) => ({ ...d, universityId: university.id })),
    )
    .onConflictDoUpdate({
      target: [degreePrograms.universityId, degreePrograms.code],
      set: { name: degreePrograms.name, kind: degreePrograms.kind },
    })
    .returning();

  console.log(`  ✓ Degree programs: ${insertedDegrees.map((d) => d.name).join(", ")}`);

  // 3. Create cohorts for each degree — 2025/26, 1Q and 2Q, Group A
  const cohortRows = insertedDegrees.flatMap((deg) => [
    {
      degreeProgramId: deg.id,
      academicYear: "2025/26",
      period: "1Q",
      groupCode: "A",
    },
    {
      degreeProgramId: deg.id,
      academicYear: "2025/26",
      period: "2Q",
      groupCode: "A",
    },
  ]);

  const insertedCohorts = await db
    .insert(cohorts)
    .values(cohortRows)
    .onConflictDoUpdate({
      target: [
        cohorts.degreeProgramId,
        cohorts.academicYear,
        cohorts.period,
        cohorts.groupCode,
      ],
      set: { academicYear: cohorts.academicYear },
    })
    .returning();

  console.log(`  ✓ Cohorts: ${insertedCohorts.length} created`);

  // 4. Seed subjects for Grado Ingeniería Mecánica only (code "441")
  const mecanicaDegree = insertedDegrees.find((d) => d.code === "441");
  if (!mecanicaDegree) throw new Error("Ingeniería Mecánica degree not found");

  const cohort1Q = insertedCohorts.find(
    (c) => c.degreeProgramId === mecanicaDegree.id && c.period === "1Q",
  );
  const cohort2Q = insertedCohorts.find(
    (c) => c.degreeProgramId === mecanicaDegree.id && c.period === "2Q",
  );

  if (!cohort1Q || !cohort2Q) throw new Error("Cohorts not found for Mecánica");

  const subjectRows = [
    ...SUBJECTS_1Q.map((s) => ({
      ...s,
      cohortId: cohort1Q.id,
      universityId: university.id,
    })),
    ...SUBJECTS_2Q.map((s) => ({
      ...s,
      cohortId: cohort2Q.id,
      universityId: university.id,
    })),
  ];

  const insertedSubjects = await db
    .insert(subjects)
    .values(subjectRows)
    .onConflictDoUpdate({
      target: [subjects.cohortId, subjects.code],
      set: {
        name: subjects.name,
        credits: subjects.credits,
        color: subjects.color,
      },
    })
    .returning();

  console.log(`  ✓ Subjects: ${insertedSubjects.map((s) => s.name).join(", ")}`);
  console.log("✅ UAL seed complete.");
}

seed()
  .then(() => client.end())
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    client.end();
    process.exit(1);
  });
