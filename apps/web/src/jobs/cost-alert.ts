import { db } from "@academic-os/db";
import { resend } from "@academic-os/email";
import { DAILY_COST_THRESHOLD_EUR, estimateCostUsd, usdToEur, type ModelId } from "@academic-os/shared";
import { sql } from "drizzle-orm";

import { inngest } from "../lib/inngest.js";

/**
 * Daily cost sweep. Reads token usage from the `token_usage` table (schema
 * in ACADEMIC_OS.md §ai), sums cost in EUR and emails the admin if above
 * DAILY_COST_THRESHOLD_EUR. Silently no-ops when the table is missing so
 * CI/staging don't throw.
 */
export const costAlert = inngest.createFunction(
  { id: "cost-alert", name: "Daily LLM cost alert" },
  { cron: "0 7 * * *" },
  async ({ logger }) => {
    const adminEmail = process.env.COST_ALERT_EMAIL;
    if (!adminEmail) {
      logger.info("cost-alert: COST_ALERT_EMAIL not set — skipping");
      return { skipped: true };
    }

    interface Row extends Record<string, unknown> {
      model: string;
      input_tokens: number;
      output_tokens: number;
    }
    let rows: Row[] = [];
    try {
      const result = await db.execute<Row>(sql`
        select model, sum(input_tokens)::int as input_tokens, sum(output_tokens)::int as output_tokens
        from token_usage
        where created_at >= now() - interval '24 hours'
        group by model
      `);
      rows = Array.isArray(result) ? (result as unknown as Row[]) : [];
    } catch (err) {
      logger.warn({ err }, "cost-alert: token_usage query failed — schema not applied yet?");
      return { skipped: true };
    }

    let totalUsd = 0;
    const breakdown: { model: string; usd: number }[] = [];
    for (const r of rows) {
      const usd = estimateCostUsd(r.model as ModelId, r.input_tokens, r.output_tokens);
      totalUsd += usd;
      breakdown.push({ model: r.model, usd });
    }
    const totalEur = usdToEur(totalUsd);

    logger.info({ totalEur, breakdown }, "cost-alert: daily LLM spend");

    if (totalEur < DAILY_COST_THRESHOLD_EUR) {
      return { alerted: false, totalEur };
    }

    await resend.emails.send({
      from: "Academic OS <alerts@academic-os-mu.vercel.app>",
      to: adminEmail,
      subject: `[Academic OS] Coste LLM diario ${totalEur.toFixed(2)}€ > ${DAILY_COST_THRESHOLD_EUR}€`,
      text: [
        `Gasto últimas 24h: ${totalEur.toFixed(2)}€ (${totalUsd.toFixed(2)} USD)`,
        "",
        "Desglose por modelo:",
        ...breakdown.map((b) => `  - ${b.model}: $${b.usd.toFixed(4)}`),
        "",
        "Revisa /api/health y el dashboard de OpenAI/Anthropic para limitar.",
      ].join("\n"),
    });

    return { alerted: true, totalEur };
  },
);
