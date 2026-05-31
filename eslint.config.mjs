// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import angular from "angular-eslint";
import simpleImportSort from "eslint-plugin-simple-import-sort";

export default tseslint.config(

  // ── 1. Global ignores ────────────────────────────────────────────────────
  {
    ignores: [".angular/**", "coverage/**", "dist/**", "node_modules/**", "cypress/**"],
  },

  // ── 2. Server / tool config files (Node, no Angular templates) ──────────
  {
    files: ["server.ts", "cypress.config.ts"],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
    ],
    plugins: { "simple-import-sort": simpleImportSort },
    rules: {
      // Server is a Node process — allow structured logging, forbid casual log()
      "no-console": ["error", { allow: ["warn", "error", "info"] }],
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", {
        varsIgnorePattern: "^_",
        argsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
    },
  },

  // ── 3. Logger + error handler — the ONLY files allowed to call console ───
  // These two files ARE the console abstraction layer; they must call console
  // directly by design. All other production code must use LoggerService.
  {
    files: [
      "src/app/core/services/logger.service.ts",
      "src/app/core/services/global-error-handler.service.ts",
    ],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    plugins: { "simple-import-sort": simpleImportSort },
    processor: angular.processInlineTemplates,
    rules: {
      "no-console": "off",
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", {
        varsIgnorePattern: "^_",
        argsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
      "@typescript-eslint/consistent-type-imports": ["error", {
        prefer: "type-imports",
        fixStyle: "inline-type-imports",
      }],
      "@angular-eslint/directive-selector": ["error", { type: "attribute", prefix: "app", style: "camelCase" }],
      "@angular-eslint/component-selector": ["error", { type: "element", prefix: "app", style: "kebab-case" }],
      "@angular-eslint/prefer-inject": "error",
    },
  },

  // ── 4. Application TypeScript (production) ────────────────────────────────
  {
    files: ["**/*.ts"],
    ignores: [
      "server.ts",
      "cypress.config.ts",
      "**/*.spec.ts",
      "src/app/core/services/logger.service.ts",
      "src/app/core/services/global-error-handler.service.ts",
    ],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    plugins: { "simple-import-sort": simpleImportSort },
    processor: angular.processInlineTemplates,
    rules: {

      // ── No casual console calls — use LoggerService ───────────────────────
      // console.warn / console.error are kept as a safety net for framework
      // code that may run before the DI tree is ready, but console.log and
      // console.info must go through LoggerService.
      "no-console": ["error", { allow: ["warn", "error"] }],

      // ── Import ordering ───────────────────────────────────────────────────
      // Groups: Angular → NgRx → third-party → src/ aliases → relative → side-effects
      "simple-import-sort/imports": [
        "error",
        {
          groups: [
            ["^@angular"],
            ["^@ngrx"],
            ["^@?\\w"],
            ["^src/"],
            ["^\\."],
            ["^\\u0000"],
          ],
        },
      ],
      "simple-import-sort/exports": "error",

      // ── Naming conventions ────────────────────────────────────────────────
      "@typescript-eslint/naming-convention": [
        "error",
        // Classes, type aliases, enums → PascalCase
        { selector: "typeLike", format: ["PascalCase"] },
        // Interfaces → PascalCase, no "I" prefix (TS community standard)
        {
          selector: "interface",
          format: ["PascalCase"],
          custom: { regex: "^I[A-Z]", match: false },
        },
        // Module-level variables: camelCase (functions/signals) or UPPER_CASE (consts/tokens)
        {
          selector: "variable",
          format: ["camelCase", "UPPER_CASE", "PascalCase"],
          leadingUnderscore: "allow",
        },
        // Parameters: camelCase; leading _ marks intentionally unused params
        {
          selector: "parameter",
          format: ["camelCase"],
          leadingUnderscore: "allow",
        },
        // Class properties: camelCase (signals/injectables) or UPPER_CASE (storage keys/tokens)
        {
          selector: "classProperty",
          format: ["camelCase", "UPPER_CASE"],
          leadingUnderscore: "allow",
        },
        // Methods: camelCase only
        {
          selector: "method",
          format: ["camelCase"],
          leadingUnderscore: "allow",
        },
        // Enum members: UPPER_CASE or PascalCase (both common in TS ecosystem)
        {
          selector: "enumMember",
          format: ["UPPER_CASE", "PascalCase"],
        },
      ],

      // ── Angular-specific ──────────────────────────────────────────────────
      "@angular-eslint/directive-selector": [
        "error",
        { type: "attribute", prefix: "app", style: "camelCase" },
      ],
      "@angular-eslint/component-selector": [
        "error",
        { type: "element", prefix: "app", style: "kebab-case" },
      ],
      "@angular-eslint/prefer-inject": "error",

      // ── TypeScript strictness ─────────────────────────────────────────────
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", {
        varsIgnorePattern: "^_",
        argsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
      // Enforces `import type` for type-only imports; auto-fixable with --fix.
      // disallowTypeAnnotations: false preserves the Firebase lazy-loading pattern
      // where `typeof import('firebase/auth')` is used as an inline type in
      // variable declarations and return types to avoid top-level static imports.
      "@typescript-eslint/consistent-type-imports": ["error", {
        prefer: "type-imports",
        fixStyle: "inline-type-imports",
        disallowTypeAnnotations: false,
      }],
    },
  },

  // ── 5. Spec / test files ──────────────────────────────────────────────────
  {
    files: ["**/*.spec.ts"],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    plugins: { "simple-import-sort": simpleImportSort },
    processor: angular.processInlineTemplates,
    rules: {
      "no-console": "off",
      // Jasmine spies and test doubles often require `any`
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", {
        varsIgnorePattern: "^_",
        argsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "@typescript-eslint/consistent-type-imports": ["error", {
        prefer: "type-imports",
        fixStyle: "inline-type-imports",
        disallowTypeAnnotations: false,
      }],
      "@angular-eslint/prefer-inject": "error",
    },
  },

  // ── 6. HTML templates ─────────────────────────────────────────────────────
  {
    files: ["**/*.html"],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {},
  },
);
