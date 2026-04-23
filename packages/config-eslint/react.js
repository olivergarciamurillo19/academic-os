// @ts-check
import globals from "globals";

import { baseConfig } from "./index.js";

/**
 * React-specific overrides layered on top of baseConfig.
 * @type {import("eslint").Linter.Config[]}
 */
export const reactConfig = [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
];

export default reactConfig;
