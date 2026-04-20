// @ts-check
import { reactConfig } from "./react.js";

/**
 * Next.js app config layered on top of reactConfig.
 * The `next/core-web-vitals` + `next/typescript` presets are applied inside
 * each app's local eslint.config.mjs via FlatCompat, scoped to .ts/.tsx.
 * @type {import("eslint").Linter.Config[]}
 */
export const nextConfig = [
  ...reactConfig,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },
];

export default nextConfig;
