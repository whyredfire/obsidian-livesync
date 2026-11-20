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

Red Sync is not published in the community plug-in directory. Build it and copy it into your vault:

```sh
npm install
npm run build
mkdir -p <vault>/.obsidian/plugins/red-sync
cp main.js manifest.json styles.css <vault>/.obsidian/plugins/red-sync/
```

Then enable 'Red Sync' in Obsidian under Settings, Community plug-ins.

## Setting up the first device

1. Open Settings, Red Sync, and select 'Start setup'.
2. Choose 'I am setting this up for the first time', then 'Configure a remote manually'.
3. Choose whether to encrypt your notes. If you do, choose a passphrase and keep it safe: it is required on every device, and the data in the bucket cannot be recovered without it.
4. Enter the endpoint, keys, and bucket name, then select 'Test Settings and Continue'.
5. Confirm the restart. After restarting, this vault is uploaded to the bucket.
6. When the upload has finished, open the Red Sync settings and turn on 'Automatic sync'.

## Setting up further devices

1. On a device which is already set up, open the Red Sync settings and select 'Copy setup URI' (or 'Show QR code'). Choose a passphrase to protect the URI.
2. On the new device, select 'Start setup', choose 'I am adding a device to an existing synchronisation setup', and paste the Setup URI (or scan the QR code).
3. Confirm the restart. After restarting, the vault is fetched from the bucket.
4. Check that your files look right, then turn on 'Automatic sync' in the Red Sync settings.

## How synchronisation works

Object storage does not offer a live connection, so Red Sync synchronises on events:

- when Obsidian starts,
- when a file is opened, and
- a few seconds after changes are saved. Rapid edits are grouped: a save-triggered synchronisation starts once typing has paused for 5 seconds, or after 60 seconds at most.

You can also synchronise at any time with 'Sync now' in the settings or the ribbon icon.

## Settings

| Setting | Description |
| --- | --- |
| Bucket | The R2 bucket and endpoint in use. 'Change' re-runs the connection dialogue. |
| End-to-end encryption | Whether notes are encrypted before upload, and whether file paths are obfuscated. Changing it requires the bucket to be rebuilt; the dialogue guides you through this. |
| Automatic sync | Switches the event-driven synchronisation on or off. Fetching or overwriting turns it off so that you can review your files first. |
| Sync now | Synchronises immediately. |
| Copy setup URI / Show QR code | Configures another device with the same bucket and encryption settings. |
| Fetch everything from R2 | Rebuilds this device's local database from the bucket. |
| Overwrite R2 with this device | Replaces the data in the bucket with this vault. Other devices must fetch again afterwards. |
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
npm install
npm run check      # type checks, lint, Svelte checks, and a production build
npm run test:unit  # unit tests
npm run dev        # development build; set PATHS_TEST_INSTALL (see example.env) to copy it into a vault
```

The synchronisation engine is provided by the `@vrtmrz/livesync-commonlib` package.

## Licence and credits

MIT. Red Sync is based on [Self-hosted LiveSync](https://github.com/vrtmrz/obsidian-livesync) by vorotamoroz.
