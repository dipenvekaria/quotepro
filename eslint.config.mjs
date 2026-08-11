import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Not application code. Linting a JXA automation script and archived
    // one-off scripts with the Next.js ruleset produces only noise.
    "docs/**",
    "scripts/archive/**",
    "scripts/*.js",
  ]),
]);

export default eslintConfig;
