import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      ".agents/**",
      ".codex/**",
      ".codex-temp/**",
      ".expo/**",
      ".tmp/**",
      "android/**",
      "android.backup/**",
      "convex/**",
      "coverage/**",
      "dist/**",
      "homedecor-ai/**",
      "node_modules/**",
      "website-screenshots/**",
    ],
  },
  {
    files: ["**/*.{js,cjs,mjs,ts,tsx}"],
    extends: [tseslint.configs.recommended],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
);
