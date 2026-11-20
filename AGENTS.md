# Red Sync: notes for coding assistants

Red Sync is an Obsidian plug-in which synchronises a vault through a Cloudflare R2 bucket (S3-compatible object storage). It is a trimmed fork of Self-hosted LiveSync; only the object-storage synchronisation remains.

## Architecture

- The synchronisation engine (local PouchDB database, chunking, encryption, journal replication to S3) lives in the external package `@vrtmrz/livesync-commonlib`. Treat it as read-only; do not copy its sources into this repository.
- `src/main.ts` wires the plug-in: service hub, service modules, Obsidian modules, and service features.
- `src/common/core/replication/providers.ts` defines the only replication provider (Object Storage, `REMOTE_MINIO`).
- `src/common/core/settings/newVaultSettings.ts` holds the Red Sync defaults:
    - `R2_FIXED_OPTIONS`: region `auto`, path-style addressing, and Obsidian's request API.
    - `RED_SYNC_ENFORCED_SETTINGS`: applied on every load by `ObsidianSettingService.adjustSettings`.
    - `RED_SYNC_SYNC_TRIGGERS`: switched by the 'Automatic sync' toggle. Fetch and Rebuild turn these off while they run and back on when they finish; do not enforce them on load.
    - `periodicSyncIntervalMs`: the 'Sync every' timer in `src/serviceFeatures/replicationScheduling.ts`, driven by `periodicReplicationInterval` (0 means off) and active only while automatic sync is on. The commonlib `periodicReplication` flag stays off.
- `src/modules/features/SettingDialogue/RedSyncSettingTab.ts` is the whole settings page. Setup and connection changes go through `SetupManager`: a start screen and one form (`src/modules/features/SetupWizard/dialogs/`), which test the bucket and then schedule an upload (Rebuild) or download (Fetch).
- `src/serviceFeatures/redFlag.ts` runs a scheduled Fetch or Rebuild at start-up without questions: Fetch merges (newer copy wins, local-only files kept), Rebuild uploads, then automatic sync is switched on.
- `src/serviceFeatures/replication/centralCompatibilityRecovery.ts` downloads again automatically when another device replaced the data in R2.
- `ObsidianVaultService.vaultName()` appends `-redsync` so the local databases never collide with Self-hosted LiveSync.

## Conventions

- After setup, never interrupt the user. Decide automatically, log the decision, and show at most one plain message. Conflicts which cannot be merged keep the newer version and save the other as a conflicted copy (`src/serviceFeatures/conflictCopies`). Do not add unprompted dialogues or multi-step question chains.
- Every notice must respect 'Silence notifications' (`ObsidianServiceContext.notificationsSilenced`).
- User-facing text is English only, written in British English (for example 'synchronise', 'dialogue'), without contractions.
- Messages shown through `$msg` must exist in `src/common/messages/en.ts`; add new keys there. Plain strings are fine in `RedSyncSettingTab.ts` and commands.
- Use the `@/` import alias for files under `src/`.
- Do not reintroduce CouchDB, peer-to-peer, Hidden File Sync, Customisation Sync, Document History, or multi-language support.

## Verification

Bun is the package manager (`bun install`, `bun add`); the lockfile is `bun.lock`. Build tools and tests run under Node through `bun run`.

```sh
bun run check      # tsc, ESLint, svelte-check, production build, iOS 15 compatibility
bun run test:unit  # unit tests (vitest)
```

Releases are published by the manually run `release` workflow (`.github/workflows/release.yml`), which calls `version-bump.mjs`. Release tags are the bare version (`0.1.1`, not `v0.1.1`), because Obsidian and BRAT match the tag to `manifest.json`.
