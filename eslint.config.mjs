import tsParser from "@typescript-eslint/parser";
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { defineConfig, globalIgnores } from "eslint/config";
import * as sveltePlugin from "eslint-plugin-svelte";
import svelteParser from "svelte-eslint-parser";
import importAlias from "./scripts/eslint-import-alias.mjs";
import { baseRules, ImportAliasRules, obsidianRules } from "./eslint.config.common.mjs";
const warnWhileDev = "off"; // Change to "warn" to enable warnings for rules that are currently disabled.
const lintProjects = ["./tsconfig.json"];
export default defineConfig([
    globalIgnores([
        // Build outputs and legacy files
        "**/build",
        "**/dist/**",
        "coverage",
        "**/main.js",
        "main_org.js",
        "version-bump.mjs",
        "package.json",
        "**/*.json",
        // Build and maintenance scripts
        "scripts",

        // Config files and build scripts
        "**/jest.config.js",
        "**/rollup.config.js",
        "**/esbuild.config.mjs",
        "**/terser.*.mjs",
        ".prettierrc.*.mjs",
        ".prettierrc.mjs",
        "*.config.mjs",
        "vite.*",
        "vitest.*",
        // Testing files (Simplified patterns)
        "test/**",
        "**/test/**",
        "**/*.test.ts",
        "**/*.unit.spec.ts",
        "**/test.ts",
        "**/tests.ts",
    ]),
    ...sveltePlugin.configs["flat/base"],
    ...obsidianmd.configs.recommended,
    {
        plugins: { "livesync-imports": importAlias },
        rules: { "livesync-imports/prefer-source-alias": "error" },
    },
    {
        files: ["**/*.ts"],
        languageOptions: {
            globals: { ...globals.browser, PouchDB: "readonly" },
            parser: tsParser,
            parserOptions: {
                project: lintProjects,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        linterOptions: {
            reportUnusedDisableDirectives: false,
        },
        rules: {
            ...baseRules,
            ...obsidianRules,
            // -- Project specific rules
            ...ImportAliasRules("."),
        },
    },
    {
        files: ["**/*.svelte"],
        languageOptions: {
            globals: { ...globals.browser, PouchDB: "readonly" },
            parser: svelteParser,
            parserOptions: {
                parser: tsParser,
                project: lintProjects,
                tsconfigRootDir: import.meta.dirname,
                extraFileExtensions: [".svelte"],
            },
        },
        rules: {
            // no-unused-vars:
            // Svelte template's declarations have a lot of false positives and the rule is not worth the effort to fix at this time.
            // it may improve in the future with some options as like   ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],]
            "no-unused-vars": "off",
            ...obsidianRules,
            "obsidianmd/no-plugin-as-component": "off",
            ...ImportAliasRules("."),
        },
    },
]);
