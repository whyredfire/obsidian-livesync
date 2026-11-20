# Red Sync

Red Sync is an Obsidian plug-in which synchronises a vault between your devices through your own Cloudflare R2 bucket. It is a trimmed-down fork of [Self-hosted LiveSync](https://github.com/vrtmrz/obsidian-livesync) which keeps only the S3-compatible object storage synchronisation, with a single, simple settings page.

> [!IMPORTANT]
> - Back up your vault before installing this plug-in.
> - Do not use this plug-in alongside another synchronisation solution (including iCloud and Obsidian Sync).

## Features

- Synchronises notes and attachments through a Cloudflare R2 bucket that you own.
- Optional end-to-end encryption, with optional obfuscation of file names, folder structure, sizes, and timestamps.
- Merges simple conflicting edits automatically and opens a dialogue for the rest.
- Configures further devices from a Setup URI or a QR code.

## What you need

1. A Cloudflare account with R2 enabled.
2. An R2 bucket, for example `obsidian-vault`.
3. An R2 API token with 'Object Read & Write' permission for that bucket (Cloudflare dashboard, R2, 'Manage API tokens'). Note:
    - the Access Key ID,
    - the Secret Access Key, and
    - the S3 endpoint, `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.

The bucket does not need a CORS policy: Red Sync sends its requests through Obsidian's own request API.

## Installation

Red Sync is not published in the community plug-in directory. Build it with [Bun](https://bun.sh) and copy it into your vault:

```sh
bun install
bun run build
mkdir -p <vault>/.obsidian/plugins/red-sync
cp main.js manifest.json styles.css <vault>/.obsidian/plugins/red-sync/
```

Then enable 'Red Sync' in Obsidian under Settings, Community plug-ins.

## Setting up the first device

1. Open Settings, Red Sync, and select 'Start setup'.
2. Choose 'Start a new sync'.
3. Fill in the form:
    - Cloudflare R2: the endpoint, Access Key ID, Secret Access Key, bucket, and optionally a folder inside the bucket.
    - Encryption: turn on 'Encrypt notes' to encrypt before upload. Choose a passphrase and keep it safe: every device needs it, and the data in the bucket cannot be recovered without it. 'Hide file names' also hides the folder structure, sizes, and timestamps.
    - Options: the bucket size warning in megabytes (0 means no warning).
4. Select 'Upload this vault'. The connection is tested first. If the bucket already holds data, the button changes to 'Replace and upload', so overwriting it needs a second click.
5. Obsidian restarts and uploads the vault. When it has finished, automatic sync is turned on and 'Red Sync is ready' is shown.

## Setting up further devices

1. On a device which is already set up, open the Red Sync settings and select 'Copy setup URI'. Choose a passphrase to protect the link and whether it should expire at the end of this week, then select 'Create and copy'. Alternatively, select 'Show QR code'.
2. On the new device, select 'Start setup', then either:
    - 'Use a setup URI', and paste the link with its passphrase (or scan the QR code with the device's camera), or
    - 'Join an existing sync', and enter the same details as on the first device.
3. Obsidian restarts and downloads your notes. They are merged with anything already in the vault: the newer copy of each file wins, and files which exist only on this device are kept. Automatic sync is then turned on.

## How synchronisation works

Object storage does not offer a live connection, so Red Sync synchronises:

- when Obsidian starts,
- when a file is opened,
- a few seconds after changes are saved (a save-triggered synchronisation starts once typing has paused for 5 seconds, or after 60 seconds at most),
- every 'Sync every' seconds (60 by default), so that changes from other devices arrive without opening a file, and
- after a conflict has been merged.

You can also synchronise at any time with 'Sync now' in the settings or the ribbon icon.

## Settings

| Setting | Description |
| --- | --- |
| Bucket | The R2 bucket and endpoint in use. 'Change' re-runs the connection dialogue. |
| Bucket size warning | Warn when the data in the bucket grows beyond this many megabytes. 0 means no warning. |
| End-to-end encryption | Whether notes are encrypted before upload, and whether file names are hidden. Changing it requires the bucket to be rebuilt; the dialogue guides you through this. |
| Automatic sync | Switches all automatic synchronisation on or off. Fetching or overwriting turns it off so that you can review your files first. |
| Sync every | Seconds between periodic synchronisations while automatic sync is on. 0 turns it off; the minimum is 10. |
| Sync now | Synchronises immediately. |
| Copy setup URI / Show QR code | Configures another device with the same bucket and encryption settings. |
| Fetch everything from R2 | Rebuilds this device's local database from the bucket. |
| Overwrite R2 with this device | Replaces the data in the bucket with this vault. Other devices must fetch again afterwards. |
| Show stats for nerds | Shows synchronisation statistics in the status bar and progress notifications. When off, only urgent messages appear. |
| Log | Shows the synchronisation log. |

Fixed defaults which are not shown: region `auto`, path-style addressing, and Obsidian's request API (no CORS configuration needed).

## Commands

Available from the command palette:

- Sync now, and pause or resume all synchronisation.
- Copy settings as a new setup URI, show settings as a QR code, and use a setup URI.
- Resolve conflicts (for the active file, a picked file, or all files).
- Show log, copy a debug report, analyse database usage, and inspect database integrity.
- Scan storage and database again, apply pending changes now, and abort synchronisation immediately.

## Development

```sh
bun install
bun run check      # type checks, lint, Svelte checks, and a production build
bun run test:unit  # unit tests
bun run dev        # development build; set PATHS_TEST_INSTALL (see example.env) to copy it into a vault
```

The synchronisation engine is provided by the `@vrtmrz/livesync-commonlib` package.

## Licence and credits

MIT. Red Sync is based on [Self-hosted LiveSync](https://github.com/vrtmrz/obsidian-livesync) by vorotamoroz.
