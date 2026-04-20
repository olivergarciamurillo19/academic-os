/**
 * LLM cost estimation. Prices in USD per million tokens, updated 2026-04-20.
 * Update alongside provider price pages; see docs/RUNBOOK.md.
 */

export type ModelId =
  | "gpt-4o"
  | "gpt-4o-mini"
  | "gpt-4.1"
  | "gpt-4.1-mini"
  | "text-embedding-3-small"
  | "text-embedding-3-large"
  | "claude-sonnet-4-6"
  | "claude-opus-4-7"
  | "claude-haiku-4-5";

export interface ModelPrice {
  inputPerMillion: number;
  outputPerMillion: number;
}

export const PRICES: Record<ModelId, ModelPrice> = {
  "gpt-4o": { inputPerMillion: 2.5, outputPerMillion: 10 },
  "gpt-4o-mini": { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  "gpt-4.1": { inputPerMillion: 2, outputPerMillion: 8 },
  "gpt-4.1-mini": { inputPerMillion: 0.4, outputPerMillion: 1.6 },
  "text-embedding-3-small": { inputPerMillion: 0.02, outputPerMillion: 0 },
  "text-embedding-3-large": { inputPerMillion: 0.13, outputPerMillion: 0 },
  "claude-sonnet-4-6": { inputPerMillion: 3, outputPerMillion: 15 },
  "claude-opus-4-7": { inputPerMillion: 15, outputPerMillion: 75 },
  "claude-haiku-4-5": { inputPerMillion: 1, outputPerMillion: 5 },
};

export function estimateCostUsd(
  model: ModelId,
  inputTokens: number,
  outputTokens = 0,
): number {
  const price = PRICES[model];
  const inputCost = (inputTokens / 1_000_000) * price.inputPerMillion;
  const outputCost = (outputTokens / 1_000_000) * price.outputPerMillion;
  return Number((inputCost + outputCost).toFixed(6));
}

export function usdToEur(usd: number, rate = 0.93): number {
  return Number((usd * rate).toFixed(4));
}

export const DAILY_COST_THRESHOLD_EUR = Number(
  process.env.COST_ALERT_THRESHOLD_EUR ?? "5",
);
