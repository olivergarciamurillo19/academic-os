#!/usr/bin/env -S tsx
/**
 * scripts/seed-test-user.ts
 *
 * Crea un usuario de prueba en Supabase con su perfil y datos ficticios para
 * que los smoke tests e2e tengan algo contra lo que correr.
 *
 * Uso:
 *   tsx scripts/seed-test-user.ts --email e2e@academic-os.dev --password Test-1234
 *
 * Requiere SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY en el entorno.
 */
import { createClient } from "@supabase/supabase-js";

type Args = { email: string; password: string };

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  return {
    email: get("--email") ?? "e2e@academic-os.dev",
    password: get("--password") ?? "Test-1234!",
  };
}

async function main() {
  const { email, password } = parseArgs();
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no definidos");
  }

  const supa = createClient(url, key, { auth: { persistSession: false } });

  const existing = await supa.auth.admin.listUsers();
  const prev = existing.data.users.find((u) => u.email === email);
  if (prev) {
    console.log(`[seed] usuario ya existe: ${email} (id=${prev.id})`);
    return prev.id;
  }

  const created = await supa.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { test: true, seededAt: new Date().toISOString() },
  });
  if (created.error) throw created.error;

  const user = created.data.user;
  if (!user) throw new Error("createUser returned no user");

  console.log(`[seed] usuario creado: ${email} (id=${user.id})`);
  console.log(`[seed] password: ${password}`);
  console.log(
    "[seed] TODO: rellenar memberships/subjects/materials/events/tasks de ejemplo usando packages/db tras correr migraciones.",
  );

  return user.id;
}

main().catch((err) => {
  console.error("[seed] error:", err);
  process.exit(1);
});
