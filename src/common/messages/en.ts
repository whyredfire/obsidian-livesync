/**
 * English user-interface messages owned by Red Sync.
 *
 * Messages emitted by the synchronisation engine are supplied by
 * `@vrtmrz/livesync-commonlib` and are resolved through its English translator.
 */
export const englishMessages = {
    ", please select the option that best describes the current state of your Vault. The application will then check your files in the most appropriate way based on your selection.":
        ", please select the option that best describes the current state of your Vault. The application will then check your files in the most appropriate way based on your selection.",
    "(BETA) Always overwrite with a newer file": "(BETA) Always overwrite with a newer file",
    "(Beta) Use ignore files": "(Beta) Use ignore files",
    "(Days passed, 0 to disable automatic-deletion)": "(Days passed, 0 to disable automatic-deletion)",
    "(e.g., after editing many files whilst offline)": "(e.g., after editing many files whilst offline)",
    "(e.g., immediately after restoring on another computer, or having recovered from a backup)":
        "(e.g., immediately after restoring on another computer, or having recovered from a backup)",
    "(e.g., setting up for the first time on a new smartphone, starting from a clean slate)":
        "(e.g., setting up for the first time on a new smartphone, starting from a clean slate)",
    "(ex. Read chunks online) If this option is enabled, LiveSync reads chunks online directly instead of replicating them locally. Increasing Custom chunk size is recommended.":
        "(ex. Read chunks online) If this option is enabled, LiveSync reads chunks online directly instead of replicating them locally. Increasing Custom chunk size is recommended.",
    "(MB) If this is set, changes to local and remote files that are larger than this will be skipped. If the file becomes smaller again, a newer one will be used.":
        "(MB) If this is set, changes to local and remote files that are larger than this will be skipped. If the file becomes smaller again, a newer one will be used.",
    "(Mega chars)": "(Mega chars)",
    "(Not recommended) If set, credentials will be stored in the file.":
        "(Not recommended) If set, credentials will be stored in the file.",
    "(Obsolete) Use an old adapter for compatibility": "(Obsolete) Use an old adapter for compatibility",
    "A local database operation failed while the file was being reflected.":
        "A local database operation failed while the file was being reflected.",
    "A network error prevented the file content from being retrieved.":
        "A network error prevented the file content from being retrieved.",
    Accept: "Accept",
    "Accept unencrypted content": "Accept unencrypted content",
    Accepted: "Accepted",
    ACCEPTED: "ACCEPTED",
    "Accepting unencrypted content will be enabled. Third-party tools can add content without the E2EE passphrase. Anyone with database write access can inject plaintext. This affects received content only; content sent by this plug-in remains encrypted.":
        "Accepting unencrypted content will be enabled. Third-party tools can add content without the E2EE passphrase. Anyone with database write access can inject plaintext. This affects received content only; content sent by this plug-in remains encrypted.",
    "Access Key": "Access Key",
    "Access Key ID": "Access Key ID",
    "Active Remote Type": "Active Remote Type",
    "After restarting, the data on this device will be uploaded to the server as the 'master copy'. Please be aware that any unintended data currently on the server will be completely overwritten.":
        "After restarting, the data on this device will be uploaded to the server as the 'master copy'. Please be aware that any unintended data currently on the server will be completely overwritten.",
    "After restarting, the database on this device will be rebuilt using data from the server. If there are any unsynchronised files in this vault, conflicts may occur with the server data.":
        "After restarting, the database on this device will be rebuilt using data from the server. If there are any unsynchronised files in this vault, conflicts may occur with the server data.",
    "All revisions and chunk availability below are a snapshot of this device's local database; the remote is not queried. Review the Vault-relative path, document identifier, content-derived chunk identifiers, and metadata before sharing this report. File contents are omitted.":
        "All revisions and chunk availability below are a snapshot of this device's local database; the remote is not queried. Review the Vault-relative path, document identifier, content-derived chunk identifiers, and metadata before sharing this report. File contents are omitted.",
    "Allow sleep during synchronisation": "Allow sleep during synchronisation",
    "Allow sleep during synchronisation on the desktop": "Allow sleep during synchronisation on the desktop",
    "Allow the operating system to sleep while finite synchronisation operations are in progress.":
        "Allow the operating system to sleep while finite synchronisation operations are in progress.",
    "Also hides file names, folder structure, sizes, and timestamps from the bucket.":
        "Also hides file names, folder structure, sizes, and timestamps from the bucket.",
    "Always prompt merge conflicts": "Always prompt merge conflicts",
    "Analyse database usage": "Analyse database usage",
    "Application ID": "Application ID",
    Apply: "Apply",
    "Apply Latest Change if Conflicting": "Apply Latest Change if Conflicting",
    "Apply pending changes now": "Apply pending changes now",
    "Apply preset configuration": "Apply preset configuration",
    "Apply settings only (advanced)": "Apply settings only (advanced)",
    "Apply the settings": "Apply the settings",
    "Apply these saved choices to the current remote?\n\nCurrent remote: ${REMOTE}\n\n- ${STAGE1}\n- ${STAGE2}\n\nThe fetch flag may remain after an interruption or an incomplete cleanup. Continue only if this fetch is still intended.":
        "Apply these saved choices to the current remote?\n\nCurrent remote: ${REMOTE}\n\n- ${STAGE1}\n- ${STAGE2}\n\nThe fetch flag may remain after an interruption or an incomplete cleanup. Continue only if this fetch is still intended.",
    "Auto-accept compatible tweak mismatches": "Auto-accept compatible tweak mismatches",
    "Automatically accepts mismatches that are compatible but potentially lossy by comparing tweak modification times.":
        "Automatically accepts mismatches that are compatible but potentially lossy by comparing tweak modification times.",
    "Automatically broadcast changes to connected peers": "Automatically broadcast changes to connected peers",
    "Automatically start P2P connection on launch": "Automatically start P2P connection on launch",
    "Automatically Sync all files when opening Obsidian.": "Automatically Sync all files when opening Obsidian.",
    Back: "Back",
    "Back to file list": "Back to file list",
    "Batch database update": "Batch database update",
    "Batch database updates in LiveSync mode": "Batch database updates in LiveSync mode",
    "Batch limit": "Batch limit",
    "Batch size": "Batch size",
    "Batch size of on-demand fetching": "Batch size of on-demand fetching",
    "Before v0.17.16, we used an old adapter for the local database. Now the new adapter is preferred. However, it needs local database rebuilding. Please disable this toggle when you have enough time. If leave it enabled, also while fetching from the remote database, you will be asked to disable this.":
        "Before v0.17.16, we used an old adapter for the local database. Now the new adapter is preferred. However, it needs local database rebuilding. Please disable this toggle when you have enough time. If leave it enabled, also while fetching from the remote database, you will be asked to disable this.",
    "Begin inspection": "Begin inspection",
    "Bucket Name": "Bucket Name",
    "Calculating database usage": "Calculating database usage",
    Cancel: "Cancel",
    "Cancel all and reboot": "Cancel all and reboot",
    "Cancel inspection": "Cancel inspection",
    "Cancelling inspection…": "Cancelling inspection…",
    "Checking connection... Please wait.": "Checking connection... Please wait.",
    "Choose a file to review. Each entry shows its state and reason.":
        "Choose a file to review. Each entry shows its state and reason.",
    "Choose again": "Choose again",
    "Choose new options and continue": "Choose new options and continue",
    "Chunk revisions are always derived from their content. This stored key is retained only for compatibility.":
        "Chunk revisions are always derived from their content. This stored key is retained only for compatibility.",
    "Chunk Splitter": "Chunk Splitter",
    Close: "Close",
    "Cloudflare R2 Bucket": "Cloudflare R2 Bucket",
    "Comma separated `.gitignore, .dockerignore`": "Comma separated `.gitignore, .dockerignore`",
    "Compare time and take newer": "Compare time and take newer",
    "Conflict & Deletion Options": "Conflict & Deletion Options",
    "Connection settings or compatibility checks prevented the content request.":
        "Connection settings or compatibility checks prevented the content request.",
    "Content-derived chunk revisions (obsolete setting)": "Content-derived chunk revisions (obsolete setting)",
    Continue: "Continue",
    "Continue anyway": "Continue anyway",
    "Continue with these choices": "Continue with these choices",
    Copy: "Copy",
    "Copy database information for the active file": "Copy database information for the active file",
    "Copy failed. Select the report text and copy it manually.":
        "Copy failed. Select the report text and copy it manually.",
    "Copy report": "Copy report",
    "Could Not Read Synchronisation Settings": "Could Not Read Synchronisation Settings",
    "Could not read the remote's synchronisation settings. Check the connection and credentials, then retry.":
        "Could not read the remote's synchronisation settings. Check the connection and credentials, then retry.",
    "Could not read the remote's synchronisation settings. Retry, or continue the overwrite with this device's settings. A working connection is still required.":
        "Could not read the remote's synchronisation settings. Retry, or continue the overwrite with this device's settings. A working connection is still required.",
    "Custom Headers": "Custom Headers",
    "Custom headers for requesting the bucket. e.g. `x-custom-header1: value1\n x-custom-header2: value2`":
        "Custom headers for requesting the bucket. e.g. `x-custom-header1: value1\n x-custom-header2: value2`",
    "Custom headers for requesting the CouchDB. e.g. `x-custom-header1: value1\n x-custom-header2: value2`":
        "Custom headers for requesting the CouchDB. e.g. `x-custom-header1: value1\n x-custom-header2: value2`",
    "Data Compression": "Data Compression",
    "Data retrieval scheduled": "Data retrieval scheduled",
    "Data to Copy": "Data to Copy",
    "Database information for ${FILE}": "Database information for ${FILE}",
    "Database Name": "Database Name",
    "Database revision": "Database revision",
    "Database suffix": "Database suffix",
    Default: "Default",
    "Delay conflict resolution of inactive files": "Delay conflict resolution of inactive files",
    "Delay merge conflict prompt for inactive files.": "Delay merge conflict prompt for inactive files.",
    "Delete local files if deleted on remote": "Delete local files if deleted on remote",
    "Delete local files if not on remote": "Delete local files if not on remote",
    "Delete old metadata of deleted files on start-up": "Delete old metadata of deleted files on start-up",
    DENIED: "DENIED",
    "Deriving keys... Please wait.": "Deriving keys... Please wait.",
    desktop: "desktop",
    "Desktop only; uses more battery and network.": "Desktop only; uses more battery and network.",
    "Desktop only. Allow sleep on this device even when the general option is disabled.":
        "Desktop only. Allow sleep on this device even when the general option is disabled.",
    "Device name": "Device name",
    "Diagnostic report": "Diagnostic report",
    "Disables logging, only shows notifications. Please disable if you report an issue.":
        "Disables logging, only shows notifications. Please disable if you report an issue.",
    "Discovering revisions": "Discovering revisions",
    Dismiss: "Dismiss",
    "Display Language": "Display Language",
    "Do not check configuration mismatch before replication": "Do not check configuration mismatch before replication",
    "Do not keep metadata of deleted files.": "Do not keep metadata of deleted files.",
    "Do not split chunks in the background": "Do not split chunks in the background",
    "Do not use internal API": "Do not use internal API",
    "Doctor.Button.DismissThisVersion": "No, and do not ask again until the next release",
    "Doctor.Button.Fix": "Fix it",
    "Doctor.Button.FixButNoRebuild": "Fix it but no rebuild",
    "Doctor.Button.No": "No",
    "Doctor.Button.Skip": "Leave it as is",
    "Doctor.Button.Yes": "Yes",
    "Doctor.Dialogue.Main":
        "Hi! Config Doctor has been activated because of ${activateReason}!\nAnd, unfortunately some configurations were detected as potential problems.\nPlease be assured. Let's solve them one by one.\n\nTo let you know ahead of time, we will ask you about the following items.\n\n${issues}\n\nShall we get started?",
    "Doctor.Dialogue.MainFix":
        "\n## ${name}\n\n| Current | Ideal |\n|:---:|:---:|\n| ${current} | ${ideal} |\n\n**Recommendation Level:** ${level}\n\n### Why this has been detected?\n\n${reason}\n\n${note}\n\nFix this to the ideal value?",
    "Doctor.Dialogue.Title": "Red Sync Config Doctor",
    "Doctor.Dialogue.TitleAlmostDone": "Almost done!",
    "Doctor.Dialogue.TitleFix": "Fix issue ${current}/${total}",
    "Doctor.Level.Must": "Must",
    "Doctor.Level.Necessary": "Necessary",
    "Doctor.Level.Optional": "Optional",
    "Doctor.Level.Recommended": "Recommended",
    "Doctor.Message.NoIssues": "No issues detected!",
    "Doctor.Message.RebuildLocalRequired": "Attention! A local database rebuild is required to apply this!",
    "Doctor.Message.RebuildRequired": "Attention! A rebuild is required to apply this!",
    "Doctor.Message.SomeSkipped": "We left some issues as is. Shall I ask you again on next startup?",
    "Doctor.RULES.E2EE_V02500.REASON":
        "The End-to-End Encryption has got now more robust and faster. Also because, the previous E2EE was found to be compromised in a re-conducted code review. It should be applied as soon as possible. Really apologises for your inconvenience. And, this setting is not forward compatible. All synchronised devices must be updated to v0.25.0 or higher. Rebuilds are not required and will be converted from the new transfer to the new format, However, it is recommended to rebuild whenever possible.",
    "Download requested. You can also copy the report if downloads are unavailable on this device.":
        "Download requested. You can also copy the report if downloads are unavailable on this device.",
    "Effectively a directory. Should end with `/`. e.g., `vault-name/`.":
        "Effectively a directory. Should end with `/`. e.g., `vault-name/`.",
    "Enable advanced features": "Enable advanced features",
    "Enable advanced mode": "Enable advanced mode",
    "Enable customization sync": "Enable customization sync",
    "Enable Developers' Debug Tools (If available).": "Enable Developers' Debug Tools (If available).",
    "Enable edge case treatment features": "Enable edge case treatment features",
    "Enable forcePathStyle": "Enable forcePathStyle",
    "Enable P2P Synchronization": "Enable P2P Synchronization",
    "Enable per-file customization sync": "Enable per-file customization sync",
    "Enable power user mode": "Enable power user mode",
    "Enable poweruser features": "Enable poweruser features",
    "Enable this if your Object Storage doesn't support CORS":
        "Enable this if your Object Storage doesn't support CORS",
    "Enable this option to automatically apply the most recent change to documents even when it conflicts":
        "Enable this option to automatically apply the most recent change to documents even when it conflicts",
    "Encrypt contents on the remote database. If you use the plugin's synchronization feature, enabling this is recommended.":
        "Encrypt contents on the remote database. If you use the plugin's synchronization feature, enabling this is recommended.",
    "Encrypt data": "Encrypt data",
    "Encrypt file properties (paths, times, sizes, and Chunk references) used by Hidden File Sync and Customisation Sync. This affects future writes; manually rebuild the remote database to protect existing properties. Requires E2EE V2, Property Encryption, and compatible clients on every device.":
        "Encrypt file properties (paths, times, sizes, and Chunk references) used by Hidden File Sync and Customisation Sync. This affects future writes; manually rebuild the remote database to protect existing properties. Requires E2EE V2, Property Encryption, and compatible clients on every device.",
    "Encrypt internal file Properties": "Encrypt internal file Properties",
    "Encrypting sensitive configuration items": "Encrypting sensitive configuration items",
    Encryption: "Encryption",
    "Encryption passphrase. If changed, you should overwrite the server's database with the new (encrypted) files.":
        "Encryption passphrase. If changed, you should overwrite the server's database with the new (encrypted) files.",
    "End-to-End Encryption": "End-to-End Encryption",
    "End-to-End Encryption Algorithm": "End-to-End Encryption Algorithm",
    "Endpoint URL": "Endpoint URL",
    "Enhance chunk size": "Enhance chunk size",
    "Enter the S3 API credentials of your R2 bucket. You can create an API token with Object Read & Write permission in the Cloudflare dashboard under R2 > Manage API tokens.":
        "Enter the S3 API credentials of your R2 bucket. You can create an API token with Object Read & Write permission in the Cloudflare dashboard under R2 > Manage API tokens.",
    "Enter your Access Key ID": "Enter your Access Key ID",
    "Enter your Bucket Name": "Enter your Bucket Name",
    "Enter your passphrase": "Enter your passphrase",
    "Enter your password": "Enter your password",
    "Enter your Secret Access Key": "Enter your Secret Access Key",
    "Error during connection test: ${reason}": "Error during connection test: ${reason}",
    "Failed to connect to the server: ${reason}": "Failed to connect to the server: ${reason}",
    "Failed to connect to the server. Please check your settings.":
        "Failed to connect to the server. Please check your settings.",
    "Failed to derive the encryption key: ${reason}": "Failed to derive the encryption key: ${reason}",
    Fetch: "Fetch",
    "Fetch chunks on demand": "Fetch chunks on demand",
    "Fetch database with previous behaviour": "Fetch database with previous behaviour",
    "File prefix on the bucket": "File prefix on the bucket",
    "File to resolve conflict": "File to resolve conflict",
    Filename: "Filename",
    "Files with modification times greater than this value (in seconds since the Unix epoch) will not have their events reflected. Set to 0 to disable this limit.":
        "Files with modification times greater than this value (in seconds since the Unix epoch) will not have their events reflected. Set to 0 to disable this limit.",
    "Finalise the process and resume normal operation": "Finalise the process and resume normal operation",
    "Folder Prefix": "Folder Prefix",
    "Forces the file to be synced when opened.": "Forces the file to be synced when opened.",
    "Furthermore, if conflicts are already present in the server data, they will be synchronised to this device as they are, and you will need to resolve them locally.":
        "Furthermore, if conflicts are already present in the server data, they will be synchronised to this device as they are, and you will need to resolve them locally.",
    "Handle files as Case-Sensitive": "Handle files as Case-Sensitive",
    "Hide password": "Hide password",
    "How should files that were deleted on other devices be handled?\n\n- **${NEWER_CLEANUP}**: Delete local files if they were deleted on remote.\n  This is useful if you want to keep your vault clean and consistent across devices, but please make sure you have a backup if there is already any important data in your vault.\n- **${NEWER_SYNC_ALL}**: Recreate remote files even if they were deleted on remote.\n  This option will keep all your local files, but it may cause duplicates if there are files that exist on local but not on remote. You can clean up these duplicates manually after the synchronisation.":
        "How should files that were deleted on other devices be handled?\n\n- **${NEWER_CLEANUP}**: Delete local files if they were deleted on remote.\n  This is useful if you want to keep your vault clean and consistent across devices, but please make sure you have a backup if there is already any important data in your vault.\n- **${NEWER_SYNC_ALL}**: Recreate remote files even if they were deleted on remote.\n  This option will keep all your local files, but it may cause duplicates if there are files that exist on local but not on remote. You can clean up these duplicates manually after the synchronisation.",
    "How to display network errors when the sync server is unreachable.":
        "How to display network errors when the sync server is unreachable.",
    "How to handle extra existing local files?": "How to handle extra existing local files?",
    "If disabled(toggled), chunks will be split on the UI thread (Previous behaviour).":
        "When enabled, chunks are split on the UI thread (the previous behaviour).",
    "If enabled per-filed efficient customization sync will be used. We need a small migration when enabling this. And all devices should be updated to v0.23.18. Once we enabled this, we lost a compatibility with old versions.":
        "If enabled per-filed efficient customization sync will be used. We need a small migration when enabling this. And all devices should be updated to v0.23.18. Once we enabled this, we lost a compatibility with old versions.",
    "If enabled, changes will be automatically broadcasted to all connected peers. Notified peers will start fetching the changes.":
        "If enabled, changes will be automatically broadcasted to all connected peers. Notified peers will start fetching the changes.",
    "If enabled, chunks will be split into no more than 100 items. However, dedupe is slightly weaker.":
        "If enabled, chunks will be split into no more than 100 items. However, dedupe is slightly weaker.",
    "If enabled, efficient per-file customization sync will be used. A minor migration is required when enabling this feature, and all devices must be updated to v0.23.18. Enabling this feature will result in losing compatibility with older versions.":
        "If enabled, efficient per-file customization sync will be used. A minor migration is required when enabling this feature, and all devices must be updated to v0.23.18. Enabling this feature will result in losing compatibility with older versions.",
    "If enabled, newly created chunks are temporarily kept within the document, and graduated to become independent chunks once stabilised.":
        "If enabled, newly created chunks are temporarily kept within the document, and graduated to become independent chunks once stabilised.",
    "If enabled, the file properties will be encrypted in the remote database. This is useful for protecting sensitive information in file paths, sizes, and IDs of its chunks. If you are using V1 E2EE, this only obfuscates the file path.":
        "If enabled, the file properties will be encrypted in the remote database. This is useful for protecting sensitive information in file paths, sizes, and IDs of its chunks. If you are using V1 E2EE, this only obfuscates the file path.",
    "If enabled, the file under 1kb will be processed in the UI thread.":
        "If enabled, the file under 1kb will be processed in the UI thread.",
    "If enabled, the forcePathStyle option will be used for bucket operations.":
        "If enabled, the forcePathStyle option will be used for bucket operations.",
    "If enabled, the notification of hidden files change will be suppressed.":
        "If enabled, the notification of hidden files change will be suppressed.",
    "If enabled, the P2P connection will be automatically started when the application launches.":
        "If enabled, the P2P connection will be automatically started when the application launches.",
    "If enabled, the plugin will not attempt to connect to the remote database even if the chunk was not found locally.":
        "If enabled, the plugin will not attempt to connect to the remote database even if the chunk was not found locally.",
    "If enabled, the request API will be used to avoid `inevitable` CORS problems. This is a workaround and may not work in all cases. PLEASE READ THE DOCUMENTATION BEFORE USING THIS OPTION. This is a less-secure option.":
        "If enabled, the request API will be used to avoid `inevitable` CORS problems. This is a workaround and may not work in all cases. PLEASE READ THE DOCUMENTATION BEFORE USING THIS OPTION. This is a less-secure option.",
    "If this enabled, All files are handled as case-Sensitive (Previous behaviour).":
        "If this enabled, All files are handled as case-Sensitive (Previous behaviour).",
    "If this enabled, chunks will be split into semantically meaningful segments. Not all platforms support this feature.":
        "If this enabled, chunks will be split into semantically meaningful segments. Not all platforms support this feature.",
    "If this enabled, JWT will be used for authentication.": "If this enabled, JWT will be used for authentication.",
    "If this is set, changes to local files which are matched by the ignore files will be skipped. Remote changes are determined using local ignore files.":
        "If this is set, changes to local files which are matched by the ignore files will be skipped. Remote changes are determined using local ignore files.",
    "If this option is enabled, PouchDB will hold the connection open for 60 seconds, and if no change arrives in that time, close and reopen the socket, instead of holding it open indefinitely. Useful when a proxy limits request duration but can increase resource usage.":
        "If this option is enabled, PouchDB will hold the connection open for 60 seconds, and if no change arrives in that time, close and reopen the socket, instead of holding it open indefinitely. Useful when a proxy limits request duration but can increase resource usage.",
    "If this vault contains notes you cannot afford to lose, copy the vault folder somewhere safe before continuing.":
        "If this vault contains notes you cannot afford to lose, copy the vault folder somewhere safe before continuing.",
    "If you have unsynchronised changes in your Vault on this device, they will likely diverge from the server's versions after the reset. This may result in a large number of file conflicts.":
        "If you have unsynchronised changes in your Vault on this device, they will likely diverge from the server's versions after the reset. This may result in a large number of file conflicts.",
    Ignore: "Ignore",
    "Ignore files": "Ignore files",
    IMPORTANT: "IMPORTANT",
    "Important Notice": "Important Notice",
    "In this scenario, Red Sync will recreate metadata for every file and deliberately generate conflicts. Where the file content is identical, these conflicts will be resolved automatically.":
        "In this scenario, Red Sync will recreate metadata for every file and deliberately generate conflicts. Where the file content is identical, these conflicts will be resolved automatically.",
    "Include remote database": "Include remote database",
    "Incubate Chunks in Document": "Incubate Chunks in Document",
    "Initialise or overwrite the remote": "Initialise or overwrite the remote",
    "Inspect database integrity": "Inspect database integrity",
    "Inspect normal-file Metadata, current conflicts, and suspect content against the Vault. Remote inspection supports CouchDB. Older history is excluded; findings do not authorise deletion.":
        "Inspect normal-file Metadata, current conflicts, and suspect content against the Vault. Remote inspection supports CouchDB. Older history is excluded; findings do not authorise deletion.",
    "Inspection cancelled. The report contains only the evidence collected so far.":
        "Inspection cancelled. The report contains only the evidence collected so far.",
    "Inspection completed. Review the findings and coverage before sharing.":
        "Inspection completed. Review the findings and coverage before sharing.",
    "Inspection failed. The report records the available evidence and reasons.":
        "Inspection failed. The report records the available evidence and reasons.",
    "Inspection partially completed. Some information could not be checked; review the reported reasons.":
        "Inspection partially completed. Some information could not be checked; review the reported reasons.",
    "Internal timestamp for resolving compatible tweak mismatches.":
        "Internal timestamp for resolving compatible tweak mismatches.",
    "Interval (sec)": "Interval (sec)",
    "Join this device": "Join this device",
    "JWT Algorithm": "JWT Algorithm",
    "K.long_p2p_sync": "Peer-to-Peer Sync",
    "K.title_p2p_sync": "Peer-to-Peer Sync",
    "Keep empty folder": "Keep empty folder",
    "Keep local files even if deleted on remote": "Keep local files even if deleted on remote",
    "Keep local files even if not on remote": "Keep local files even if not on remote",
    "Keep replication active in the background": "Keep replication active in the background",
    "Key ID": "Key ID",
    "Keypair or pre-shared key": "Keypair or pre-shared key",
    "Last tweak modified timestamp": "Last tweak modified timestamp",
    "LiveSync could not handle multiple vaults which have same name without different prefix, This should be automatically configured.":
        "LiveSync could not handle multiple vaults which have same name without different prefix, This should be automatically configured.",
    "liveSyncReplicator.beforeLiveSync": "Before LiveSync, start OneShot once...",
    "liveSyncReplicator.cantReplicateLowerValue": "We can't replicate more lower value.",
    "liveSyncReplicator.checkingLastSyncPoint": "Looking for the point last synchronized point.",
    "liveSyncReplicator.couldNotConnectTo": "Could not connect to ${uri} : ${name}\n(${db})",
    "liveSyncReplicator.couldNotConnectToRemoteDb": "Could not connect to remote database: ${d}",
    "liveSyncReplicator.couldNotConnectToServer": "The connection to the remote has been prevented, or failed.",
    "liveSyncReplicator.couldNotConnectToURI": "Could not connect to ${uri}:${dbRet}",
    "liveSyncReplicator.couldNotMarkResolveRemoteDb": "Could not mark resolve remote database.",
    "liveSyncReplicator.liveSyncBegin": "LiveSync begin...",
    "liveSyncReplicator.lockRemoteDb": "Lock remote database to prevent data corruption",
    "liveSyncReplicator.markDeviceResolved": "Mark this device as 'resolved'.",
    "liveSyncReplicator.mismatchedTweakDetected":
        "Some mismatches have been detected in the configuration between devices. Running a manual replication will attempt to resolve this issue.",
    "liveSyncReplicator.oneShotSyncBegin": "OneShot Sync begin... (${syncMode})",
    "liveSyncReplicator.remoteDbCorrupted":
        "Remote database is newer or corrupted, make sure to latest version of self-hosted-livesync installed",
    "liveSyncReplicator.remoteDbCreatedOrConnected": "Remote Database Created or Connected",
    "liveSyncReplicator.remoteDbDestroyed": "Remote Database Destroyed",
    "liveSyncReplicator.remoteDbDestroyError": "Something happened on Remote Database Destroy:",
    "liveSyncReplicator.remoteDbMarkedResolved": "Remote database has been marked resolved.",
    "liveSyncReplicator.replicationClosed": "Replication closed",
    "liveSyncReplicator.replicationInProgress": "Replication is already in progress",
    "liveSyncReplicator.retryLowerBatchSize": "Retry with lower batch size:${batch_size}/${batches_limit}",
    "liveSyncReplicator.unlockRemoteDb": "Unlock remote database to prevent data corruption",
    "logPane.autoScroll": "Auto scroll",
    "logPane.logWindowOpened": "Log window opened",
    "logPane.pause": "Pause",
    "logPane.title": "Red Sync Log",
    "logPane.wrap": "Wrap",
    "Longest chunk line threshold value (Not Configurable from the UI Now).":
        "Longest chunk line threshold value (Not Configurable from the UI Now).",
    "Maximum delay for batch database updating": "Maximum delay for batch database updating",
    "Maximum file modification time for reflected file events":
        "Maximum file modification time for reflected file events",
    "Maximum file size": "Maximum file size",
    "Maximum Incubating Chunk Size": "Maximum Incubating Chunk Size",
    "Maximum Incubating Chunks": "Maximum Incubating Chunks",
    "Maximum Incubation Period": "Maximum Incubation Period",
    "Maximum request size for manually resending chunks": "Maximum request size for manually resending chunks",
    "MB (0 to disable).": "MB (0 to disable).",
    "MB per request": "MB per request",
    "Memory cache size (by total characters)": "Memory cache size (by total characters)",
    "Memory cache size (by total items)": "Memory cache size (by total items)",
    Metadata: "Metadata",
    "Minimum Chunk Size (Not Configurable from the UI Now).": "Minimum Chunk Size (Not Configurable from the UI Now).",
    "Minimum delay for batch database updating": "Minimum delay for batch database updating",
    "Minimum interval for syncing": "Minimum interval for syncing",
    "moduleCheckRemoteSize.logCheckingStorageSizes": "Checking storage sizes",
    "moduleCheckRemoteSize.logCurrentStorageSize": "Remote storage size: ${measuredSize}",
    "moduleCheckRemoteSize.logExceededWarning": "Remote storage size: ${measuredSize} exceeded ${notifySize}",
    "moduleCheckRemoteSize.logThresholdEnlarged": "Threshold has been enlarged to ${size}MB",
    "moduleCheckRemoteSize.msgConfirmRebuild":
        "This may take a bit of a long time. Do you really want to rebuild everything now?",
    "moduleCheckRemoteSize.msgDatabaseGrowing":
        "**Your database is getting larger!** But do not worry, we can address it now. The time before running out of space on the remote storage.\n\n| Measured size | Configured size |\n| --- | --- |\n| ${estimatedSize} | ${maxSize} |\n\n> [!MORE]-\n> If you have been using it for many years, there may be unreferenced chunks - that is, garbage - accumulating in the database. Therefore, we recommend rebuilding everything. It will probably become much smaller.\n>\n> If the volume of your vault is simply increasing, it is better to rebuild everything after organizing the files. Red Sync does not delete the actual data even if you delete it to speed up the process. It is roughly [documented](https://github.com/vrtmrz/obsidian-livesync/blob/main/docs/tech_info.md).\n>\n> If you don't mind the increase, you can increase the notification limit by 100MB. This is the case if you are running it on your own server. However, it is better to rebuild everything from time to time.\n>\n\n> [!WARNING]\n> If you perform rebuild everything, make sure all devices are synchronised. The plug-in will merge as much as possible, though.\n",
    "moduleCheckRemoteSize.msgSetDBCapacity":
        "We can set a maximum database capacity warning, **to take action before running out of space on the remote storage**.\nDo you want to enable this?\n\n> [!MORE]-\n> - 0: Do not warn about storage size.\n>   This is recommended if you have enough space on the remote storage especially you have self-hosted. And you can check the storage size and rebuild manually.\n> - 800: Warn if the remote storage size exceeds 800MB.\n>   This is recommended if you are using fly.io with 1GB limit or IBM Cloudant.\n> - 2000: Warn if the remote storage size exceeds 2GB.\n\nIf we have reached the limit, we will be asked to enlarge the limit step by step.\n",
    "moduleCheckRemoteSize.noticeExceeded":
        "Remote storage size is ${measuredSize}, above the configured ${notifySize} notification threshold. {HERE}",
    "moduleCheckRemoteSize.noticeNotConfigured": "Remote storage size notifications are not configured. {HERE}",
    "moduleCheckRemoteSize.option2GB": "2GB (Standard)",
    "moduleCheckRemoteSize.option800MB": "800MB (Cloudant, fly.io)",
    "moduleCheckRemoteSize.optionAskMeLater": "Ask me later",
    "moduleCheckRemoteSize.optionDismiss": "Dismiss",
    "moduleCheckRemoteSize.optionIncreaseLimit": "Increase to ${newMax} MB",
    "moduleCheckRemoteSize.optionNoWarn": "No, never warn please",
    "moduleCheckRemoteSize.optionRebuildAll": "Rebuild Everything Now",
    "moduleCheckRemoteSize.optionReview": "Review options",
    "moduleCheckRemoteSize.titleDatabaseSizeLimitExceeded": "Remote storage size exceeded the limit",
    "moduleCheckRemoteSize.titleDatabaseSizeNotify": "Setting up database size notification",
    "moduleInputUIObsidian.defaultTitleConfirmation": "Confirmation",
    "moduleInputUIObsidian.defaultTitleSelect": "Select",
    "moduleInputUIObsidian.optionNo": "No",
    "moduleInputUIObsidian.optionYes": "Yes",
    "moduleLiveSyncMain.logAdditionalSafetyScan": "Additional safety scan...",
    "moduleLiveSyncMain.logLoadingPlugin": "Loading plugin...",
    "moduleLiveSyncMain.logPluginInitCancelled": "Plugin initialisation was cancelled by a module",
    "moduleLiveSyncMain.logPluginVersion": "Red Sync v${manifestVersion} ${packageVersion}",
    "moduleLiveSyncMain.logSafetyScanCompleted": "Additional safety scan completed",
    "moduleLiveSyncMain.logSafetyScanFailed": "Additional safety scan has failed on a module",
    "moduleLiveSyncMain.logUnloadingPlugin": "Unloading plugin...",
    "moduleLiveSyncMain.msgScramEnabled":
        "Red Sync has been configured to ignore some events. Is this correct?\n\n| Type | Status | Note |\n|:---:|:---:|---|\n| Storage Events | ${fileWatchingStatus} | Every modification will be ignored |\n| Database Events | ${parseReplicationStatus} | Every synchronised change will be postponed |\n\nDo you want to resume them and restart Obsidian?\n\n> [!DETAILS]-\n> These flags are set by the plug-in while rebuilding, or fetching. If the process ends abnormally, it may be kept unintended.\n> If you are not sure, you can try to rerun these processes. Make sure to back your vault up.\n",
    "moduleLiveSyncMain.optionKeepLiveSyncDisabled": "Keep LiveSync disabled",
    "moduleLiveSyncMain.optionResumeAndRestart": "Resume and restart Obsidian",
    "moduleLiveSyncMain.titleScramEnabled": "Scram Enabled",
    "moduleLocalDatabase.logWaitingForReady": "Waiting for ready...",
    "moduleLog.pathComponentTooLong":
        "This path contains a file or folder name longer than ${maxBytes} UTF-8 bytes. It may not work on some Android and Linux file systems.",
    "moduleLog.showLog": "Show Log",
    "moduleMigration.fix0256.buttons.checkItLater": "Check it later",
    "moduleMigration.fix0256.buttons.DismissForever": "I have fixed it, and do not ask again",
    "moduleMigration.fix0256.buttons.fix": "Fix",
    "moduleMigration.fix0256.message":
        'Due to a recent bug (in v0.25.6), some files may not have been saved correctly in the sync database.\nWe have scanned our files and found some that need to be fixed.\n\n**Files ready to be fixed:**\n\n${files}\n\nThese files have size-matched original file on the storage, and are likely to be recoverable.\nWe can use them to fix the database, please click the "Fix" button below to fix them.\n\n${messageUnrecoverable}\n\nIf you want to run it again, you can do so from Hatch.\n',
    "moduleMigration.fix0256.messageUnrecoverable":
        "**Files cannot be fixed on this device:**\n\n${filesNotRecoverable}\n\nThese files have inconsistent metadata, and cannot be fixed on this device (mostly we cannot determine which is correct).\nTo restore them, please check your other devices (also by this feature) or restore them manually from a backup.\n",
    "moduleMigration.fix0256.title": "Broken files has been detected",
    "moduleMigration.insecureChunkExist.buttons.fetch": "I already rebuilt the remote. Fetch from the remote",
    "moduleMigration.insecureChunkExist.buttons.later": "I will do it later",
    "moduleMigration.insecureChunkExist.buttons.rebuild": "Rebuild Everything",
    "moduleMigration.insecureChunkExist.laterMessage": "We strongly recommend to treat this as soon as possible!",
    "moduleMigration.insecureChunkExist.message":
        "Some chunks are not securely stored and are not encrypted in databases.\n**Please rebuild the database to fix this issue**.\n\nIf your Remote Database is not configured with SSL, or using less-secure credentials, **you are at risk of exposing sensitive data**.\n\nNote: Please upgrade your Red Sync v0.25.6 or higher on all your devices, and back your vault up surely.\nNote2: Rebuild Everything and Fetch consumes a bit of time and traffic, please do it in off-peak hours and ensure a stable network connection.\n",
    "moduleMigration.insecureChunkExist.title": "Insecure chunks found!",
    "moduleMigration.logBulkSendCorrupted":
        "Send chunks in bulk has been enabled, however, this feature had been corrupted. Sorry for your inconvenience. Automatically disabled.",
    "moduleMigration.logLocalDatabaseNotReady": "Something went wrong! The local database is not ready",
    "moduleObsidianMenu.replicate": "Replicate",
    "Mostly Complete: Decision Required": "Mostly Complete: Decision Required",
    "Move remotely deleted files to the trash, instead of deleting.":
        "Move remotely deleted files to the trash, instead of deleting.",
    "Move remotely deleted files to the trash, instead of deleting. (This setting is ineffective from Obsidian v1.7.2 onwards, as deletion always respects your Obsidian preferences.)":
        "Move remotely deleted files to the trash, instead of deleting. (This setting is ineffective from Obsidian v1.7.2 onwards, as deletion always respects your Obsidian preferences.)",
    Name: "Name",
    "Names in this report": "Names in this report",
    "Needs review": "Needs review",
    "Network warning style": "Network warning style",
    "New Remote": "New Remote",
    "No Synchronisation Settings Found": "No Synchronisation Settings Found",
    "No, please take me back": "No, please take me back",
    'Not all messages have been translated. And, please revert to "Default" when reporting errors.':
        'Not all messages have been translated. And, please revert to "Default" when reporting errors.',
    "Not now": "Not now",
    "Notify all setting files": "Notify all setting files",
    "Notify customized": "Notify customized",
    "Notify when other device has newly customized.": "Notify when other device has newly customized.",
    "Notify when the estimated remote storage size exceeds on start up":
        "Notify when the estimated remote storage size exceeds on start up",
    "Now we can choose how to split the chunks; V3 is the most efficient. If you have troubled, please make this Default or Legacy.":
        "Now we can choose how to split the chunks; V3 is the most efficient. If you have troubled, please make this Default or Legacy.",
    "Number of batches to process at a time. Defaults to 40. Minimum is 2. This along with batch size controls how many docs are kept in memory at a time.":
        "Number of batches to process at a time. Defaults to 40. Minimum is 2. This along with batch size controls how many docs are kept in memory at a time.",
    "Number of changes to sync at a time. Defaults to 50. Minimum is 2.":
        "Number of changes to sync at a time. Defaults to 50. Minimum is 2.",
    "Obfuscate file paths": "Obfuscate file paths",
    Ok: "Ok",
    "Only secure (HTTPS) connections can be used on Obsidian Mobile.":
        "Only secure (HTTPS) connections can be used on Obsidian Mobile.",
    "Optional, e.g. my-vault/": "Optional, e.g. my-vault/",
    "Original names": "Original names",
    "Other devices will need to fetch from R2 again afterwards. If this vault contains notes you cannot afford to lose, copy the vault folder somewhere safe first.":
        "Other devices will need to fetch from R2 again afterwards. If this vault contains notes you cannot afford to lose, copy the vault folder somewhere safe first.",
    Overwrite: "Overwrite",
    "Overwrite all with remote files": "Overwrite all with remote files",
    "Overwrite Server Data with This Device's Files": "Overwrite Server Data with This Device's Files",
    "P2P Status pane": "P2P Status pane",
    "P2P.AskPassphraseForDecrypt":
        "The remote peer shared the configuration. Please input the passphrase to decrypt the configuration.",
    "P2P.AskPassphraseForShare":
        "The remote peer requested this device configuration. Please input the passphrase to share the configuration. You can ignore the request by cancelling this dialogue.",
    "P2P.DisabledButNeed": "Peer-to-Peer Sync is disabled. Do you really want to enable it?",
    "P2P.NoAutoSyncPeers": "No auto-sync peers found. Please set peers on the Peer-to-Peer Sync pane.",
    "P2P.NoKnownPeers": "No peers has been detected, waiting incoming other peers...",
    "P2P.NotEnabled": "Peer-to-Peer Sync is not enabled. We cannot open a new connection.",
    "P2P.ReplicatorInstanceMissing": "P2P Sync replicator is not found, possibly not have been configured or enabled.",
    "P2P.SeemsOffline": "Peer ${name} seems offline, skipped.",
    "P2P.SyncAlreadyRunning": "P2P Sync is already running.",
    "P2P.SyncCompleted": "P2P Sync completed.",
    "P2P.SyncStartedWith": "P2P Sync with ${name} have been started.",
    "Partial Usage results are available as JSON so their coverage and reasons stay with the rows.":
        "Partial Usage results are available as JSON so their coverage and reasons stay with the rows.",
    Passphrase: "Passphrase",
    "Passphrase of sensitive configuration items": "Passphrase of sensitive configuration items",
    password: "password",
    Password: "Password",
    Path: "Path",
    "Path identity mode": "Path identity mode",
    "Per-file-saved customization sync": "Per-file-saved customization sync",
    "Periodic Sync interval": "Periodic Sync interval",
    "Pick a file to resolve conflict": "Pick a file to resolve conflict",
    "PLEASE NOTE": "PLEASE NOTE",
    "Please select 'Cancel' explicitly to cancel this operation.":
        "Please select 'Cancel' explicitly to cancel this operation.",
    "Please select an option to proceed": "Please select an option to proceed",
    "Please select the button below to restart and proceed to the data fetching confirmation.":
        "Please select the button below to restart and proceed to the data fetching confirmation.",
    "Please select the button below to restart and proceed to the final confirmation.":
        "Please select the button below to restart and proceed to the final confirmation.",
    "Please select your situation.": "Please select your situation.",
    "Please use V2, V1 is deprecated and will be removed in the future, It was not a very appropriate algorithm. Only for compatibility V1 is kept.":
        "Please use V2, V1 is deprecated and will be removed in the future, It was not a very appropriate algorithm. Only for compatibility V1 is kept.",
    Presets: "Presets",
    "Proceed to the next step.": "Proceed to the next step.",
    "Process files even if seems to be corrupted": "Process files even if seems to be corrupted",
    "Process small files in the foreground": "Process small files in the foreground",
    "Property Encryption": "Property Encryption",
    "Pseudonyms (recommended)": "Pseudonyms (recommended)",
    "Pseudonyms include a public salt, so guessed paths can be checked. Original names include private filenames. Reports omit file contents and credentials.":
        "Pseudonyms include a public salt, so guessed paths can be checked. Original names include private filenames. Reports omit file contents and credentials.",
    "Read available local revisions and report their Chunk references. Settings are left unchanged.":
        "Read available local revisions and report their Chunk references. Settings are left unchanged.",
    "Reading revisions": "Reading revisions",
    "Reason unavailable": "Reason unavailable",
    "Reboot to re-run the process": "Reboot to re-run the process",
    "Reducing the frequency with which on-disk changes are reflected into the DB":
        "Reducing the frequency with which on-disk changes are reflected into the DB",
    "Reflection could not be confirmed after the retry.": "Reflection could not be confirmed after the retry.",
    Region: "Region",
    "Remote server type": "Remote server type",
    "Replicator.Dialogue.Locked.Action.Dismiss": "Cancel for reconfirmation",
    "Replicator.Dialogue.Locked.Action.Fetch": "Reset Synchronisation on This Device",
    "Replicator.Dialogue.Locked.Action.Unlock": "Unlock the remote database",
    "Replicator.Dialogue.Locked.Message":
        "Remote database is locked. This is due to a rebuild on one of the terminals.\nThe device is therefore asked to withhold the connection to avoid database corruption.\n\nThere are three options that we can do:\n\n- Reset Synchronisation on This Device\n  The most preferred and reliable way. This will dispose the local database once, and reset all synchronisation information from the remote database again, In most case, we can perform this safely. However, it takes some time and should be done in stable network.\n- Unlock the remote database\n  This method can only be used if we are already reliably synchronised by other replication methods. This does not simply mean that we have the same files. If you are not sure, you should avoid it.\n- Cancel for reconfirmation\n    This will cancel the operation. And we will asked again on next request.\n",
    "Replicator.Dialogue.Locked.Message.Fetch":
        "Fetch all has been scheduled. Plug-in will be restarted to perform it.",
    "Replicator.Dialogue.Locked.Message.Unlocked": "The remote database has been unlocked. Please retry the operation.",
    "Replicator.Dialogue.Locked.Title": "Locked",
    "Replicator.Message.Cleaned": "Database cleaning up is in process. replication has been cancelled",
    "Replicator.Message.InitialiseFatalError": "No replicator is available, this is the fatal error.",
    "Replicator.Message.Pending": "Some file events are pending. Replication has been cancelled.",
    "Replicator.Message.SomeModuleFailed": "Replication has been cancelled by some module failure",
    "Replicator.Message.VersionUpFlash":
        "Remote synchronisation is paused for compatibility review. Run the 'Review why synchronisation is paused' command for details and available actions.",
    "Report copied.": "Report copied.",
    "Report format": "Report format",
    "Required file content could not be retrieved from the remote while the file was being reflected.":
        "Required file content could not be retrieved from the remote while the file was being reflected.",
    "Required file content was not found on the server.": "Required file content was not found on the server.",
    "Requires restart of Obsidian.": "Requires restart of Obsidian.",
    "Reset and Resume Synchronisation": "Reset and Resume Synchronisation",
    "Reset notification threshold and check the remote database usage":
        "Reset notification threshold and check the remote database usage",
    "Reset Synchronisation on This Device": "Reset Synchronisation on This Device",
    "Resolve all conflicted files": "Resolve all conflicted files",
    "Restart and Fetch Data": "Restart and Fetch Data",
    "Restart and Initialise Server": "Restart and Initialise Server",
    "Resume scheduled fetch?": "Resume scheduled fetch?",
    Retry: "Retry",
    "Retry running": "Retry running",
    "Retry this file": "Retry this file",
    "Review file": "Review file",
    "Review files": "Review files",
    "Room ID": "Room ID",
    "Rotation Duration": "Rotation Duration",
    "Save report": "Save report",
    "Save settings to a markdown file. You will be notified when new settings arrive. You can set different files by the platform.":
        "Save settings to a markdown file. You will be notified when new settings arrive. You can set different files by the platform.",
    "Saved fetch choices could not be read": "Saved fetch choices could not be read",
    "Saving will be performed forcefully after this number of seconds.":
        "Saving will be performed forcefully after this number of seconds.",
    "Scan changes on customization sync": "Scan changes on customization sync",
    "Scan customization automatically": "Scan customization automatically",
    "Scan customization before replicating.": "Scan customization before replicating.",
    "Scan customization every 1 minute.": "Scan customization every 1 minute.",
    "Scan customization periodically": "Scan customization periodically",
    "Scan for hidden files before replication": "Scan for hidden files before replication",
    "Scan hidden files periodically": "Scan hidden files periodically",
    "Seconds, 0 to disable": "Seconds, 0 to disable",
    "Seconds. Saving to the local database will be delayed until this value after we stop typing or saving.":
        "Seconds. Saving to the local database will be delayed until this value after we stop typing or saving.",
    "Secret Access Key": "Secret Access Key",
    "Secret Key": "Secret Key",
    "Selecting this option will result in the current data on this device being used to initialise the server. Any existing data on the server will be completely overwritten.":
        "Selecting this option will result in the current data on this device being used to initialise the server. Any existing data on the server will be completely overwritten.",
    "Selecting this option will result in this device joining the existing server. You need to fetching the existing synchronisation data from the server to this device.":
        "Selecting this option will result in this device joining the existing server. You need to fetching the existing synchronisation data from the server to this device.",
    "Server URI": "Server URI",
    "SettingService.ConfigurationCouldNotBeDecrypted":
        "Existing configuration could not be decrypted. The configuration key was not changed.",
    "SettingService.ConfigurationEncryptionSaveFailed":
        "Configuration encryption could not be saved. Verify the saved settings and device key before retrying.",
    "SettingService.ConfigurationPassphraseCancelled":
        "Configuration passphrase entry was cancelled or unavailable. Start-up was stopped; saved settings were retained.",
    "SettingService.ConfigurationPassphraseDeviceLocalDescription":
        "This passphrase stays on this device. When another device needs to decrypt protected settings without a saved key, enter the same passphrase at start-up.",
    "SettingService.ConfigurationPassphraseRetryTitle":
        "Configuration could not be decrypted. Enter the configuration passphrase again.",
    "SettingService.ConfigurationPassphraseRollbackFailed":
        "The configuration passphrase could not be restored after a write failure. Verify the saved settings and device key before retrying.",
    "SettingService.ConfigurationPassphraseTitle": "Configuration passphrase",
    "Setup Complete: Preparing to Fetch Synchronisation Data":
        "Setup Complete: Preparing to Fetch Synchronisation Data",
    "Setup Complete: Preparing to Initialise Server": "Setup Complete: Preparing to Initialise Server",
    "Setup URI dialog cancelled.": "Setup URI dialog cancelled.",
    "Setup.QRCode":
        'We have generated a QR code to transfer the settings. Please scan the QR code with your phone or other device.\nNote: The QR code is not encrypted, so be careful to open this.\n\n>[!FOR YOUR EYES ONLY]-\n> <div class="sls-qr">${qr_image}</div>',
    "Should we keep folders that don't have any files inside?":
        "Should we keep folders that don't have any files inside?",
    "Should we only check for conflicts when a file is opened?":
        "Should we only check for conflicts when a file is opened?",
    "Should we prompt you about conflicting files when a file is opened?":
        "Should we prompt you about conflicting files when a file is opened?",
    "Should we prompt you for every single merge, even if we can safely merge automatcially?":
        "Should we prompt you for every single merge, even if we can safely merge automatcially?",
    "Show only notifications": "Show only notifications",
    "Show password": "Show password",
    "Show status as icons only": "Show status as icons only",
    "Show status icon instead of file warnings banner": "Show status icon instead of file warnings banner",
    "Show status inside the editor": "Show status inside the editor",
    "Show status on the status bar": "Show status on the status bar",
    "Show verbose log. Please enable if you report an issue.":
        "Show verbose log. Please enable if you report an issue.",
    "Signalling Relays": "Signalling Relays",
    "Since you have chosen to overwrite all local files with remote data, **how would you like to handle local files that are not present in the remote database?**\n\n- **${DELETE_ALL}**: Local-only files and remote-deleted files will be removed.\n  This option will make your local vault exactly the same as the remote database, but please make sure you have a backup if there is any important data in your vault.\n- **${DELETE_NONE}**: All existing local files will be preserved.\n  This option will keep all your local files, but it may cause duplicates if there are files that exist on local but not on remote. You can clean up these duplicates manually after the synchronisation.":
        "Since you have chosen to overwrite all local files with remote data, **how would you like to handle local files that are not present in the remote database?**\n\n- **${DELETE_ALL}**: Local-only files and remote-deleted files will be removed.\n  This option will make your local vault exactly the same as the remote database, but please make sure you have a backup if there is any important data in your vault.\n- **${DELETE_NONE}**: All existing local files will be preserved.\n  This option will keep all your local files, but it may cause duplicates if there are files that exist on local but not on remote. You can clean up these duplicates manually after the synchronisation.",
    "Size warning (MB)": "Size warning (MB)",
    "Some files could not be reflected in the Vault. Review the affected files.":
        "Some files could not be reflected in the Vault. Review the affected files.",
    "Some files failed to synchronise. What would you like to do?":
        "Some files failed to synchronise. What would you like to do?",
    "Starts synchronisation when a file is saved.": "Starts synchronisation when a file is saved.",
    "Stop reflecting database changes to storage files.": "Stop reflecting database changes to storage files.",
    "Stop watching for file changes.": "Stop watching for file changes.",
    "Subject (whoami)": "Subject (whoami)",
    "Suppress notification of hidden files change": "Suppress notification of hidden files change",
    "Suspend database reflecting": "Suspend database reflecting",
    "Suspend file watching": "Suspend file watching",
    "Sync after merging file": "Sync after merging file",
    "Sync automatically after merging files": "Sync automatically after merging files",
    "Sync Mode": "Sync Mode",
    "Sync now": "Sync now",
    "Sync on Editor Save": "Sync on Editor Save",
    "Sync on File Open": "Sync on File Open",
    "Sync on Save": "Sync on Save",
    "Sync on Startup": "Sync on Startup",
    "Synchronisation Issues Detected": "Synchronisation Issues Detected",
    "Test Settings and Continue": "Test Settings and Continue",
    "Testing only - Resolve file conflicts by syncing newer copies of the file, this can overwrite modified files. Be Warned.":
        "Testing only - Resolve file conflicts by syncing newer copies of the file, this can overwrite modified files. Be Warned.",
    "The algorithm used for JWT authentication.": "The algorithm used for JWT authentication.",
    "The Application ID for P2P connection. This should be same among your devices. Default is 'self-hosted-livesync' and could not be modified from the UI.":
        "The Application ID for P2P connection. This should be same among your devices. Default is 'self-hosted-livesync' and could not be modified from the UI.",
    "The connection to the server has been configured successfully. As the next step,":
        "The connection to the server has been configured successfully. As the next step,",
    "The content request was cancelled.": "The content request was cancelled.",
    "The credential/password for the TURN servers.": "The credential/password for the TURN servers.",
    "The delay for consecutive on-demand fetches": "The delay for consecutive on-demand fetches",
    "The fetch flag does not contain one supported selection. Choose new options and continue with the current remote?\n\nCurrent remote: ${REMOTE}\n\nThe flag contents will remain unchanged. The new choices apply only to this attempt; another restart will ask again. Completing or cancelling the fetch removes the flag.":
        "The fetch flag does not contain one supported selection. Choose new options and continue with the current remote?\n\nCurrent remote: ${REMOTE}\n\nThe flag contents will remain unchanged. The new choices apply only to this attempt; another restart will ask again. Completing or cancelling the fetch removes the flag.",
    "The file content could not be retrieved.": "The file content could not be retrieved.",
    "The files in this Vault are almost identical to the server's.":
        "The files in this Vault are almost identical to the server's.",
    "The Hash algorithm for chunk IDs": "The Hash algorithm for chunk IDs",
    "The inspection could not finish. Close this dialogue and try again after database startup.":
        "The inspection could not finish. Close this dialogue and try again after database startup.",
    "The key (PSK in HSxxx in base64, or private key in ESxxx in PEM) used for JWT authentication.":
        "The key (PSK in HSxxx in base64, or private key in ESxxx in PEM) used for JWT authentication.",
    "The key ID. this should be matched with CouchDB->jwt_keys->ALG:_`kid`.":
        "The key ID. this should be matched with CouchDB->jwt_keys->ALG:_`kid`.",
    "the latest synchronisation data will be downloaded from the server to this device.":
        "the latest synchronisation data will be downloaded from the server to this device.",
    "The local database connection was unavailable when the file was being reflected.":
        "The local database connection was unavailable when the file was being reflected.",
    "the local database, that is to say the synchronisation information, must be reconstituted.":
        "the local database, that is to say the synchronisation information, must be reconstituted.",
    "The maximum duration for which chunks can be incubated within the document. Chunks exceeding this period will graduate to independent chunks.":
        "The maximum duration for which chunks can be incubated within the document. Chunks exceeding this period will graduate to independent chunks.",
    "The maximum number of chunks that can be incubated within the document. Chunks exceeding this number will immediately graduate to independent chunks.":
        "The maximum number of chunks that can be incubated within the document. Chunks exceeding this number will immediately graduate to independent chunks.",
    "The maximum total size of chunks that can be incubated within the document. Chunks exceeding this size will immediately graduate to independent chunks.":
        "The maximum total size of chunks that can be incubated within the document. Chunks exceeding this size will immediately graduate to independent chunks.",
    "The minimum interval for automatic synchronisation on event.":
        "The minimum interval for automatic synchronisation on event.",
    "The network was offline when the file content was needed.":
        "The network was offline when the file content was needed.",
    "The Nostr relay servers to establish connections for P2P connections. Multiple servers can be separated by commas.":
        "The Nostr relay servers to establish connections for P2P connections. Multiple servers can be separated by commas.",
    "The Passphrase for P2P connection. This should be same among your devices.":
        "The Passphrase for P2P connection. This should be same among your devices.",
    "The pending recovery state could not be saved. The automatic retry was not started.":
        "The pending recovery state could not be saved. The automatic retry was not started.",
    "The previous retry was interrupted. Review the file before retrying.":
        "The previous retry was interrupted. Review the file before retrying.",
    "The retrieved file content could not be validated.": "The retrieved file content could not be validated.",
    "The retry could not be started. Try again later.": "The retry could not be started. Try again later.",
    "The Room ID for P2P connection. This should be same among your devices.":
        "The Room ID for P2P connection. This should be same among your devices.",
    "The Rotation duration of token in minutes. Each generated tokens will be valid only within this duration.":
        "The Rotation duration of token in minutes. Each generated tokens will be valid only within this duration.",
    "The selected remote has no saved synchronisation settings. This is normal for a new remote. Use this device's settings, or cancel if you expected existing settings.":
        "The selected remote has no saved synchronisation settings. This is normal for a new remote. Use this device's settings, or cancel if you expected existing settings.",
    "The server did not authorise the content request.": "The server did not authorise the content request.",
    "The subject for JWT authentication. Mostly username.": "The subject for JWT authentication. Mostly username.",
    "the synchronisation data on the server will be built based on the current data on this device.":
        "the synchronisation data on the server will be built based on the current data on this device.",
    "The TURN servers to use for P2P connections. Multiple servers can be separated by commas.":
        "The TURN servers to use for P2P connections. Multiple servers can be separated by commas.",
    "The username for the TURN servers.": "The username for the TURN servers.",
    "There are no files waiting for reflection review.": "There are no files waiting for reflection review.",
    "There may be differences between the files in this Vault and the server.":
        "There may be differences between the files in this Vault and the server.",
    "This file has ${COUNT} unresolved versions. They will be reviewed one pair at a time.":
        "This file has ${COUNT} unresolved versions. They will be reviewed one pair at a time.",
    "This file has unresolved conflicts.": "This file has unresolved conflicts.",
    "This passphrase will not be copied to another device. It will be set to `Default` until you configure it again.":
        "This passphrase will not be copied to another device. It will be set to `Default` until you configure it again.",
    "This report contains original paths and identifiers. Review them before sharing.":
        "This report contains original paths and identifiers. Review them before sharing.",
    "This report uses temporary pseudonyms. Counts and relationships remain visible.":
        "This report uses temporary pseudonyms. Counts and relationships remain visible.",
    "This Vault is empty, or contains only new files that are not on the server.":
        "This Vault is empty, or contains only new files that are not on the server.",
    "This vault will be uploaded to the bucket as the master copy. Anything already stored in the bucket is deleted first.":
        "This vault will be uploaded to the bucket as the master copy. Anything already stored in the bucket is deleted first.",
    "This will rebuild the local database on this device using the most recent data from the server. This action is designed to resolve synchronisation inconsistencies and restore correct functionality.":
        "This will rebuild the local database on this device using the most recent data from the server. This action is designed to resolve synchronisation inconsistencies and restore correct functionality.",
    "To minimise the creation of new conflicts": "To minimise the creation of new conflicts",
    "To stop the countdown, tap anywhere on the dialogue": "To stop the countdown, tap anywhere on the dialogue",
    "TURN Credential": "TURN Credential",
    "TURN Servers": "TURN Servers",
    "TURN Username": "TURN Username",
    "TweakMismatchResolve.Action.Dismiss": "Dismiss",
    "TweakMismatchResolve.Action.UseConfigured": "Use configured settings",
    "TweakMismatchResolve.Action.UseMine": "Update remote database settings",
    "TweakMismatchResolve.Action.UseMineAcceptIncompatible": "Update remote database settings but keep as is",
    "TweakMismatchResolve.Action.UseMineWithRebuild": "Update remote database settings and rebuild again",
    "TweakMismatchResolve.Action.UseRemote": "Apply settings to this device",
    "TweakMismatchResolve.Action.UseRemoteAcceptIncompatible":
        "Apply settings to this device, but and ignore incompatibility",
    "TweakMismatchResolve.Action.UseRemoteWithRebuild": "Apply settings to this device, and fetch again",
    "TweakMismatchResolve.Message.Main":
        "\nThe settings in the remote database are as follows. These values are configured by other devices, which are synchronised with this device at least once.\n\nIf you want to use these settings, please select Use configured settings.\nIf you want to keep the settings of this device, please select Dismiss.\n\n${table}\n\n>[!TIP]\n> If you want to synchronise all settings, please use `Sync settings via markdown` after applying minimal configuration with this feature.\n\n${additionalMessage}",
    "TweakMismatchResolve.Message.MainTweakResolving":
        "Your configuration has not been matched with the one on the remote server.\n\nFollowing configuration should be matched:\n\n${table}\n\nLet us know your decision.\n\n${additionalMessage}",
    "TweakMismatchResolve.Message.mineUpdated": "The device configuration have been adjusted.",
    "TweakMismatchResolve.Message.remoteUpdated": "The configuration stored remotely has been updated.",
    "TweakMismatchResolve.Message.UseRemote.WarningRebuildRecommended":
        "\n>[!NOTICE]\n> Some changes are compatible but may consume extra storage and transfer volumes. A rebuild is recommended. However, a rebuild may not be performed at present, but may be implemented in future maintenance.\n> ***Please ensure that you have time and are connected to a stable network to apply!***",
    "TweakMismatchResolve.Message.UseRemote.WarningRebuildRequired":
        "\n>[!WARNING]\n> Some remote configurations are not compatible with the local database of this device. Rebuilding the local database will be required.\n> ***Please ensure that you have time and are connected to a stable network to apply!***",
    "TweakMismatchResolve.Message.WarningIncompatibleRebuildRecommended":
        "\n>[!NOTICE]\n> We have detected that some of the values are different to make incompatible the local database with the remote database.\n> Some changes are compatible but may consume extra storage and transfer volumes. A rebuild is recommended. However, a rebuild may not be performed at present, but may be implemented in future maintenance.\n> If you want to rebuild, it takes a few minutes or more. **Make sure it is safe to perform it now.**",
    "TweakMismatchResolve.Message.WarningIncompatibleRebuildRequired":
        "\n>[!WARNING]\n> We have detected that some of the values are different to make incompatible the local database with the remote database.\n> Either local or remote rebuilds are required. Both of them takes a few minutes or more. **Make sure it is safe to perform it now.**",
    "TweakMismatchResolve.Table": "| Value name | This device | On Remote |\n|: --- |: ---- :|: ---- :|\n${rows}\n\n",
    "TweakMismatchResolve.Table.Row": "| ${name} | ${self} | ${remote} |",
    "TweakMismatchResolve.Title.TweakResolving": "Configuration Mismatch Detected",
    "TweakMismatchResolve.Title.UseRemoteConfig": "Use Remote Configuration",
    "Ui.Common.LocalDatabaseInitialisationFailed":
        "Red Sync cannot synchronise. Generate a report to review the detailed log.",
    "Ui.Common.Signal.Caution": "CAUTION",
    "Ui.Common.Signal.Danger": "DANGER",
    "Ui.Common.Signal.Notice": "NOTICE",
    "Ui.Common.Signal.Warning": "WARNING",
    "Ui.Common.SomeFilesCouldNotBeSynchronised":
        "Not all files could be synchronised. Check the affected files. Generate a report to review the detailed log.",
    "Ui.SetupWizard.ApplySettingsInitialisation.Back": "Review another way to apply these settings",
    "Ui.SetupWizard.ApplySettingsInitialisation.FetchOption": "Reset Synchronisation on This Device",
    "Ui.SetupWizard.ApplySettingsInitialisation.FetchOptionDesc":
        "After restarting, rebuild this device's local database from the current remote synchronisation data. Files in the Vault will then be reconciled with that data.",
    "Ui.SetupWizard.ApplySettingsInitialisation.Guidance":
        "These setting changes alter how synchronisation data is interpreted. Apply them together with an initialisation operation after restart.",
    "Ui.SetupWizard.ApplySettingsInitialisation.ProceedFetch": "Restart and Fetch Synchronisation Data",
    "Ui.SetupWizard.ApplySettingsInitialisation.ProceedRebuild": "Restart and Overwrite Server Data",
    "Ui.SetupWizard.ApplySettingsInitialisation.Question": "Which existing data should be used after restart?",
    "Ui.SetupWizard.ApplySettingsInitialisation.RebuildOption": "Overwrite Server Data with This Device's Files",
    "Ui.SetupWizard.ApplySettingsInitialisation.RebuildOptionDesc":
        "Rebuild the local and remote databases from the files currently in this Vault. Other synchronising devices must reset their local synchronisation afterwards.",
    "Ui.SetupWizard.ApplySettingsInitialisation.Title": "Apply Settings and Reinitialise Synchronisation",
    "Ui.SetupWizard.Common.ProceedSelectOption": "Please select an option to proceed",
    "Ui.SetupWizard.Invitation.Start": "Start setup",
    "Ui.SetupWizard.OutroExistingUser.FetchSyncGuidance":
        "Fetch disables **automatic synchronisation** on this device.\n\nAfter restarting, follow the Fetch prompts. Wait for the files to appear in the Vault and review them, then turn on **Automatic sync** in the Red Sync settings.",
    "Ui.SetupWizard.OutroExistingUser.Next": "Next",
    "Ui.SetupWizard.OutroExistingUser.RestartConfirmationTitle": "Before restarting",
    "Ui.SetupWizard.SelectNew.ManualOptionDesc":
        "Enter your Cloudflare R2 bucket details and choose whether to encrypt your notes. Choose this when setting up your first device.",
    "Unique name between all synchronized devices. To edit this setting, please disable customization sync once.":
        "Unique name between all synchronized devices. To edit this setting, please disable customization sync once.",
    "Unless you are certain, selecting this options is bit dangerous. It assumes that the server configuration is compatible with this device. If this is not the case, data loss may occur. Please ensure you know what you are doing.":
        "Unless you are certain, selecting this options is bit dangerous. It assumes that the server configuration is compatible with this device. If this is not the case, data loss may occur. Please ensure you know what you are doing.",
    "Upload this vault": "Upload this vault",
    "Upload this vault to R2": "Upload this vault to R2",
    "Use a folder prefix to keep several vaults in one bucket. Leave it blank to use the bucket root.":
        "Use a folder prefix to keep several vaults in one bucket. Leave it blank to use the bucket root.",
    "Use Custom HTTP Handler": "Use Custom HTTP Handler",
    "Use dynamic iteration count": "Use dynamic iteration count",
    "Use Internal API": "Use Internal API",
    "Use JWT instead of Basic Authentication": "Use JWT instead of Basic Authentication",
    "Use Only Local Chunks": "Use Only Local Chunks",
    "Use Request API to avoid `inevitable` CORS problem": "Use Request API to avoid `inevitable` CORS problem",
    "Use Segmented-splitter": "Use Segmented-splitter",
    "Use splitting-limit-capped chunk splitter": "Use splitting-limit-capped chunk splitter",
    "Use the detailed flow": "Use the detailed flow",
    "Use the same passphrase on every device. If you lose it, the data in the bucket cannot be recovered.":
        "Use the same passphrase on every device. If you lose it, the data in the bucket cannot be recovered.",
    "Use the trash bin": "Use the trash bin",
    "Use this device's settings": "Use this device's settings",
    "Use timeouts instead of heartbeats": "Use timeouts instead of heartbeats",
    username: "username",
    Username: "Username",
    "Vault and database revision": "Vault and database revision",
    "Vault file": "Vault file",
    "Verbose Log": "Verbose Log",
    "Version 0 preserves legacy path identity; version 1 uses Unicode NFC. Physical file names stay unchanged. Update every device and stop synchronisation, then Rebuild from a complete authoritative Vault and Fetch on the other devices. With P2P, Rebuild prepares only the source device's local database. Resolve colliding file names first.":
        "Version 0 preserves legacy path identity; version 1 uses Unicode NFC. Physical file names stay unchanged. Update every device and stop synchronisation, then Rebuild from a complete authoritative Vault and Fetch on the other devices. With P2P, Rebuild prepares only the source device's local database. Resolve colliding file names first.",
    "Wait for a bounded local quiet period before processing file updates in LiveSync mode, reducing intermediate database updates while delaying their reflection to remote devices.":
        "Wait for a bounded local quiet period before processing file updates in LiveSync mode, reducing intermediate database updates while delaying their reflection to remote devices.",
    Waiting: "Waiting",
    "Warn when the data in the bucket grows beyond this size. Leave it at 0 for no warning.":
        "Warn when the data in the bucket grows beyond this size. Leave it at 0 for no warning.",
    "Warning! This will have a serious impact on performance. And the logs will not be synchronised under the default name. Please be careful with logs; they often contain your confidential information.":
        "Warning! This will have a serious impact on performance. And the logs will not be synchronised under the default name. Please be careful with logs; they often contain your confidential information.",
    "We are about to retrieve the remote data.\n\nFirstly, how shall we handle the data retrieved from this remote source?\n\n- **${NEWER_WINS}**: Compares the modified time of files and takes the newer one.\n  If you have been using Red Sync and have made changes on multiple devices, this option may be suitable for you as it tries to merge changes based on modified time.\n- **${REMOTE_WINS}**: Remote data is the source of truth.\n  If you are new to using Red Sync. This option may be easiest to understand and get started with.\n  It will overwrite all your local files with the remote data, so please make sure you have a backup if there is any important data in your vault.\n- **${DETAILED}**: Opens the detailed setup wizard.\n  If you want to have more control over the synchronisation process, or want to review the changes before applying, you can choose this option to use the detailed flow.":
        "We are about to retrieve the remote data.\n\nFirstly, how shall we handle the data retrieved from this remote source?\n\n- **${NEWER_WINS}**: Compares the modified time of files and takes the newer one.\n  If you have been using Red Sync and have made changes on multiple devices, this option may be suitable for you as it tries to merge changes based on modified time.\n- **${REMOTE_WINS}**: Remote data is the source of truth.\n  If you are new to using Red Sync. This option may be easiest to understand and get started with.\n  It will overwrite all your local files with the remote data, so please make sure you have a backup if there is any important data in your vault.\n- **${DETAILED}**: Opens the detailed setup wizard.\n  If you want to have more control over the synchronisation process, or want to review the changes before applying, you can choose this option to use the detailed flow.",
    "We will now guide you through a few questions to simplify the synchronisation setup.":
        "We will now guide you through a few questions to simplify the synchronisation setup.",
    "Welcome to Red Sync": "Welcome to Red Sync",
    "When enabled, notes are encrypted on this device before they are uploaded, so the bucket only stores data that cannot be read without your passphrase.":
        "When enabled, notes are encrypted on this device before they are uploaded, so the bucket only stores data that cannot be read without your passphrase.",
    "When the upload has finished, turn on Automatic sync in the Red Sync settings.":
        "When the upload has finished, turn on Automatic sync in the Red Sync settings.",
    "When you save a file in the editor, start a sync automatically":
        "When you save a file in the editor, start a sync automatically",
    "While enabled, it causes very performance impact but debugging replication testing and other features will be enabled. Please disable this if you have not read the source code. Requires restart of Obsidian. Sometimes there is no implementation.":
        "While enabled, it causes very performance impact but debugging replication testing and other features will be enabled. Please disable this if you have not read the source code. Requires restart of Obsidian. Sometimes there is no implementation.",
    "Write credentials in the file": "Write credentials in the file",
    "Write logs into the file": "Write logs into the file",
    "xxhash64 is the current default.": "xxhash64 is the current default.",
    "You can enable this setting to process the files with size mismatches, these files can be created by some APIs or integrations.":
        "You can enable this setting to process the files with size mismatches, these files can be created by some APIs or integrations.",
} as const;

export type MessageKey = keyof typeof englishMessages;
