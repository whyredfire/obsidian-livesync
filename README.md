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

Red Sync is not listed in the community plug-in directory. Install it with [BRAT](https://github.com/TfTHacker/obsidian42-brat), which also keeps it up to date:

1. In Obsidian, open Settings, Community plug-ins, Browse, then install and enable 'BRAT'.
2. Run the command 'BRAT: Plugins: Add a beta plugin for testing' and enter `whyredfire/obsidian-redsync`.
3. Enable 'Red Sync' under Settings, Community plug-ins.

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
- after a conflict has been resolved.

You can also synchronise at any time with 'Sync now' in the settings or the ribbon icon.

After setup, Red Sync does not ask questions on its own, with one exception:

- **A note changed on two devices.** Red Sync first merges the changes itself. Only if that is not possible does it ask, when you open the note: **Merge both** (keep the text from both versions), **Keep both** (keep the newer version and save the other as `Note (Conflicted copy 202611211430).md`), or **Keep newer**. Other files, such as images, keep the newer version automatically.
- **Another device replaced the data in R2.** This device downloads everything again by itself, the same way as joining: the newer copy of each note wins and notes which exist only here are kept.
- **R2 cannot be reached.** Synchronisation waits and tries again; a scheduled download or upload runs at the next start-up.

## Settings

| Setting | Description |
| --- | --- |
| Bucket / End-to-end encryption | The R2 bucket and whether notes are encrypted. 'Change' reopens setup with the current details filled in. |
| Bucket size warning | Warn once at start-up when the data in the bucket grows beyond this many megabytes. 0 means no warning. |
| Automatic sync | Switches all automatic synchronisation on or off. |
| Sync every | Seconds between periodic synchronisations while automatic sync is on. 0 turns it off; the minimum is 10. |
| Sync now | Synchronises immediately. |
| Silence notifications | Shows no pop-up notifications on this device at all. Everything is still recorded in the log. |
| Copy setup URI / Show QR code | Configures another device with the same bucket and encryption settings. |
| Fetch everything from R2 | Downloads everything again and merges it with this vault. |
| Overwrite R2 with this device | Replaces the data in the bucket with this vault. Other devices download it again automatically. |
| Show stats for nerds | Shows synchronisation statistics in the status bar and progress notifications. When off, only important messages appear. |
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

## Releasing

Run the 'release' workflow from the Actions tab with the new version, for example `0.1.1`. It sets the version in `package.json`, `manifest.json`, and `versions.json`, runs the checks and tests, commits and tags the version, and publishes a GitHub release with `main.js`, `manifest.json`, and `styles.css`. BRAT installs updates from these releases.

## Licence and credits

MIT. Red Sync is based on [Self-hosted LiveSync](https://github.com/vrtmrz/obsidian-livesync) by vorotamoroz.
