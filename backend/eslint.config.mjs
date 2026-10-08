import js from "@eslint/js"
import prettier from "eslint-config-prettier"
import globals from "globals"
import tseslint from "typescript-eslint"

export default tseslint.config(
  { ignores: ["dist", "coverage", "node_modules", "src/generated"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "error",
      // process.env is read only in src/config/env.ts
      "no-restricted-properties": [
        "error",
        { object: "process", property: "env", message: "Import `config` from @/config instead." },
      ],
    },
  },
  {
    files: ["src/config/env.ts", "prisma.config.ts"],
    rules: { "no-restricted-properties": "off" },
  },
  prettier,
)
