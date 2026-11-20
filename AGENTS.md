# Red Sync: notes for coding assistants

Red Sync is an Obsidian plug-in which synchronises a vault through a Cloudflare R2 bucket (S3-compatible object storage). It is a trimmed fork of Self-hosted LiveSync; only the object-storage synchronisation remains.

## Architecture

- The synchronisation engine (local PouchDB database, chunking, encryption, journal replication to S3) lives in the external package `@vrtmrz/livesync-commonlib`. Treat it as read-only; do not copy its sources into this repository.
- `src/main.ts` wires the plug-in: service hub, service modules, Obsidian modules, and service features.
- `src/common/core/replication/providers.ts` defines the only replication provider (Object Storage, `REMOTE_MINIO`).
- `src/common/core/settings/newVaultSettings.ts` holds the Red Sync defaults:
    - `R2_FIXED_OPTIONS`: region `auto`, path-style addressing, and Obsidian's request API.
    - `RED_SYNC_ENFORCED_SETTINGS`: applied on every load by `ObsidianSettingService.adjustSettings`.
    - `RED_SYNC_SYNC_TRIGGERS`: switched by the 'Automatic sync' toggle. Fetch and Rebuild turn these off on purpose; do not enforce them on load.
- `src/modules/features/SettingDialogue/RedSyncSettingTab.ts` is the whole settings page. Connection and encryption changes go through `SetupManager` dialogues (`src/modules/features/SetupWizard/dialogs/`), which test the connection and decide between uploading (Rebuild) and downloading (Fetch).
- `ObsidianVaultService.vaultName()` appends `-redsync` so the local databases never collide with Self-hosted LiveSync.

## Conventions

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
