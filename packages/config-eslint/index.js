// @ts-check
import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Base flat config for Academic OS packages.
 * Type-aware rules apply only to .ts/.tsx files; JS/MJS/CJS files get the
 * non-type-aware variant so config files don't need to live in a tsconfig.
 * @type {import("eslint").Linter.Config[]}
 */
export const baseConfig = [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/.vercel/**",
      "**/next-env.d.ts",
    ],
  },
  js.configs.recommended,

  // Type-aware rules — TS only.
  ...tseslint.configs.recommendedTypeChecked.map((c) => ({
    ...c,
    files: ["**/*.{ts,tsx,mts,cts}"],
  })),
  ...tseslint.configs.stylisticTypeChecked.map((c) => ({
    ...c,
    files: ["**/*.{ts,tsx,mts,cts}"],
  })),

  // Non-type-aware TS-eslint baseline for JS config files.
  ...tseslint.configs.recommended.map((c) => ({
    ...c,
    files: ["**/*.{js,mjs,cjs}"],
  })),

  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2024,
      },
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      "import/order": [
        "warn",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
    },
  },

  // TS-specific rules (type-aware).
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },

  prettier,
];

export default baseConfig;
