#!/usr/bin/env -S tsx
/**
 * scripts/cost-report.ts — genera reporte de coste LLM del último mes.
 *
 * Lee la tabla `token_usage` (columns: user_id, model, input_tokens,
 * output_tokens, operation, created_at) y agrupa por usuario y operación,
 * estimando el coste en USD/EUR con @academic-os/shared.
 *
 * Uso:
 *   DATABASE_URL=... tsx scripts/cost-report.ts [--days 30]
 */
import postgres from "postgres";
import { estimateCostUsd, usdToEur, type ModelId } from "../packages/shared/src/cost.js";

function arg(flag: string, fallback: string): string {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? (process.argv[i + 1] ?? fallback) : fallback;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no definido");
  const days = Number(arg("--days", "30"));

  const sql = postgres(url, { max: 1 });

  try {
    type Row = {
      user_id: string | null;
      operation: string | null;
      model: string;
      input_tokens: number;
      output_tokens: number;
    };
    const rows = await sql<Row[]>`
      select
        user_id,
        operation,
        model,
        sum(input_tokens)::int as input_tokens,
        sum(output_tokens)::int as output_tokens
      from token_usage
      where created_at >= now() - (${days}::int || ' days')::interval
      group by user_id, operation, model
      order by user_id nulls last, operation, model
    `;

    let totalUsd = 0;
    const perUser = new Map<string, number>();
    const perOperation = new Map<string, number>();

    console.log(`# Coste LLM últimos ${days} días\n`);
    console.log(`| user_id | operation | model | in_tokens | out_tokens | cost_usd |`);
    console.log(`|---|---|---|---:|---:|---:|`);
    for (const r of rows) {
      const usd = estimateCostUsd(r.model as ModelId, r.input_tokens, r.output_tokens);
      totalUsd += usd;
      perUser.set(r.user_id ?? "<anon>", (perUser.get(r.user_id ?? "<anon>") ?? 0) + usd);
      perOperation.set(r.operation ?? "<null>", (perOperation.get(r.operation ?? "<null>") ?? 0) + usd);
      console.log(
        `| ${r.user_id ?? "<anon>"} | ${r.operation ?? "-"} | ${r.model} | ${r.input_tokens} | ${r.output_tokens} | $${usd.toFixed(4)} |`,
      );
    }

    console.log(`\n**Total:** $${totalUsd.toFixed(2)} ≈ ${usdToEur(totalUsd).toFixed(2)}€`);

    console.log(`\n## Por usuario\n`);
    for (const [u, usd] of [...perUser.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`- ${u}: $${usd.toFixed(4)}`);
    }

    console.log(`\n## Por operación\n`);
    for (const [op, usd] of [...perOperation.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`- ${op}: $${usd.toFixed(4)}`);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error("[cost-report] error:", err);
  process.exit(1);
});
