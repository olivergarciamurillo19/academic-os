import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import nextBase from "@academic-os/config-eslint/next";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const nextTsCompat = compat
  .extends("next/core-web-vitals", "next/typescript")
  .map((c) => ({ ...c, files: ["**/*.{ts,tsx}"] }));

export default [
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
  },
  ...nextBase,
  ...nextTsCompat,
];
