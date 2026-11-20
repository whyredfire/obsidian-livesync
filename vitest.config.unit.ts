/**
 * @file vitest.config.unit.ts
 * @description Configuration for running unit tests in Node.js (excluding browser harnesses, E2E, and database integration tests).
 * Run with `bun run test:unit`, or with coverage via `bun run test:unit:coverage`.
 */
import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vitest.config.common";

const importOnlyFiles = ["**/encryption/encryptHKDF.ts"];
const obsidianRuntimeOnlyFiles = ["src/deps.ts", "src/serviceModules/FileSystemAdapters/ObsidianTypeGuardAdapter.ts"];
export default mergeConfig(
    viteConfig,
    defineConfig({
        resolve: {
            alias: {
                obsidian: "", // prevent accidental imports of obsidian types in unit tests,
            },
        },
        test: {
            logHeapUsage: true,
            // maxConcurrency: 2,
            name: "unit-tests",
            include: ["**/*unit.test.ts", "**/*.unit.spec.ts"],
            exclude: ["node_modules/**", ".devmemo.local/**", "test/e2e-cli/**"],
            coverage: {
                include: ["src/**/*.ts"],
                exclude: [
                    "**/*.test.ts",
                    "**/*unit.test.ts",
                    "**/*.unit.spec.ts",
                    "**/*.integration.spec.ts",
                    "test/**",
                    "**/_*",
                    "**/*_obsolete.ts",
                    ...importOnlyFiles,
                    ...obsidianRuntimeOnlyFiles,
                ],
                provider: "v8",
                reporter: ["text", "json", "html", ["text", { file: "coverage-text.txt" }]],
            },
        },
    })
);
