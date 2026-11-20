import { readFileSync, writeFileSync } from "node:fs";

// Set the release version in package.json, manifest.json and versions.json.
// Usage: node version-bump.mjs 1.2.3
const version = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(version ?? "")) {
    console.error("Version must look like 1.2.3");
    process.exit(1);
}

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const writeJson = (path, value) => writeFileSync(path, JSON.stringify(value, null, 4) + "\n");

const pkg = readJson("package.json");
pkg.version = version;
writeJson("package.json", pkg);

const manifest = readJson("manifest.json");
manifest.version = version;
writeJson("manifest.json", manifest);

// Obsidian reads versions.json to find the newest release an older app version can install.
const versions = readJson("versions.json");
versions[version] ??= manifest.minAppVersion;
writeJson("versions.json", versions);
