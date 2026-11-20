/**
 * @file vitest.config.integration.ts
 * @description Configuration for integration tests which use a real (in-memory) PouchDB database.
 * Run with `bun run test:integration`.
 */
import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vitest.config.common";

export default mergeConfig(
    viteConfig,
    defineConfig({
        resolve: {
            alias: {
                obsidian: "", // prevent accidental imports of obsidian types in integration tests
            },
        },
        test: {
            logHeapUsage: true,
            name: "integration-tests",
            include: ["**/*.integration.spec.ts", "**/*.integration.test.ts"],
            exclude: ["test/**"],
        },
    })
);
