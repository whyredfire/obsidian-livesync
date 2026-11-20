<script lang="ts">
    import DialogHeader from "@/modules/services/LiveSyncUI/components/DialogHeader.svelte";
    import Guidance from "@/modules/services/LiveSyncUI/components/Guidance.svelte";
    import Decision from "@/modules/services/LiveSyncUI/components/Decision.svelte";
    import UserDecisions from "@/modules/services/LiveSyncUI/components/UserDecisions.svelte";
    import InfoNote from "@/modules/services/LiveSyncUI/components/InfoNote.svelte";
    import InputRow from "@/modules/services/LiveSyncUI/components/InputRow.svelte";
    import Password from "@/modules/services/LiveSyncUI/components/Password.svelte";
    import {
        type BucketSyncSetting,
        type ObsidianLiveSyncSettings,
        DEFAULT_SETTINGS,
        PREFERRED_JOURNAL_SYNC,
        RemoteTypes,
    } from "@vrtmrz/livesync-commonlib/compat/common/types";

    import { onMount } from "svelte";
    import { getDialogContext, type GuestDialogProps } from "@/modules/services/LiveSyncUI/svelteDialog";
    import { copyTo, pickBucketSyncSettings } from "@vrtmrz/livesync-commonlib/compat/common/utils";
    import { TYPE_CANCELLED, type SetupRemoteBucketResultType } from "./setupDialogTypes";
    import { $msg as translateMessage } from "@/common/translation";
    import { withOwnedRemoteResource } from "@/common/core/replication/ownedRemoteResource";
    import { REMOTE_RESOURCE_KINDS } from "@vrtmrz/livesync-commonlib/replication";
    import { R2_FIXED_OPTIONS } from "@/common/core/settings/newVaultSettings";

    const default_setting = pickBucketSyncSettings(DEFAULT_SETTINGS);

    let syncSetting = $state<BucketSyncSetting>({ ...default_setting });

    type Props = GuestDialogProps<SetupRemoteBucketResultType, BucketSyncSetting>;

    const { setResult, getInitialData }: Props = $props();

    // Megabytes; 0 means no warning.
    let sizeWarning = $state(0);

    onMount(() => {
        if (getInitialData) {
            const initialData = getInitialData();
            if (initialData) {
                copyTo(initialData, syncSetting);
                const threshold = (initialData as Partial<ObsidianLiveSyncSettings>).notifyThresholdOfRemoteStorageSize;
                sizeWarning = threshold !== undefined && threshold > 0 ? threshold : 0;
            }
        }
    });
    const sizeWarningValid = $derived(Number.isInteger(sizeWarning) && sizeWarning >= 0);

    function withSizeWarning(setting: BucketSyncSetting) {
        return { ...setting, notifyThresholdOfRemoteStorageSize: sizeWarningValid ? sizeWarning : 0 };
    }
    let error = $state("");
    const context = getDialogContext();
    const isEndpointSecure = $derived.by(() => {
        return syncSetting.endpoint.trim().toLowerCase().startsWith("https://");
    });
    const isEndpointInsecure = $derived.by(() => {
        return syncSetting.endpoint.trim().toLowerCase().startsWith("http://");
    });
    const isEndpointSupplied = $derived.by(() => {
        return isEndpointInsecure || isEndpointSecure;
    });
    const canProceed = $derived.by(() => {
        return (
            syncSetting.accessKey.trim() !== "" &&
            syncSetting.secretKey.trim() !== "" &&
            syncSetting.bucket.trim() !== "" &&
            syncSetting.endpoint.trim() !== "" &&
            isEndpointSupplied
        );
    });

    function generateSetting() {
        const connSetting: BucketSyncSetting = {
            ...syncSetting,
            ...R2_FIXED_OPTIONS,
        };
        const trialSettings: BucketSyncSetting = {
            ...connSetting,
        };

        const trialRemoteSetting: ObsidianLiveSyncSettings = {
            ...DEFAULT_SETTINGS,
            ...PREFERRED_JOURNAL_SYNC,
            remoteType: RemoteTypes.REMOTE_MINIO,
            ...trialSettings,
        };
        return trialRemoteSetting;
    }

    let processing = $state(false);
    async function checkConnection() {
        try {
            processing = true;
            const trialRemoteSetting = generateSetting();
            const probe = await context.services.replicator.createRemoteResource(
                REMOTE_RESOURCE_KINDS.CONNECTION,
                trialRemoteSetting
            );
            if (!probe) {
                return translateMessage("Failed to connect to the server. Please check your settings.");
            }
            try {
                const result = await withOwnedRemoteResource(probe, (ownedProbe) =>
                    ownedProbe.check({ createIfMissing: true, showResult: false })
                );
                if (result.ok) {
                    return "";
                } else {
                    return translateMessage("Failed to connect to the server. Please check your settings.");
                }
            } catch (e) {
                return translateMessage("Failed to connect to the server: ${reason}", { reason: `${e}` });
            }
        } finally {
            processing = false;
        }
    }

    async function checkAndCommit() {
        error = "";
        try {
            error = (await checkConnection()) || "";
            if (!error) {
                const setting = generateSetting();
                setResult(withSizeWarning(pickBucketSyncSettings(setting)));
                return;
            }
        } catch (e) {
            error = translateMessage("Error during connection test: ${reason}", { reason: `${e}` });
            return;
        }
    }
    function commit() {
        setResult(withSizeWarning(pickBucketSyncSettings(generateSetting())));
    }
    function cancel() {
        setResult(TYPE_CANCELLED);
    }
</script>

<DialogHeader title={translateMessage("Cloudflare R2 Bucket")} />
<Guidance>
    {translateMessage(
        "Enter the S3 API credentials of your R2 bucket. You can create an API token with Object Read & Write permission in the Cloudflare dashboard under R2 > Manage API tokens."
    )}
</Guidance>
<InputRow label={translateMessage("Endpoint URL")}>
    <input
        type="text"
        name="s3-endpoint"
        placeholder="https://<ACCOUNT_ID>.r2.cloudflarestorage.com"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        required
        pattern="^https?://.+"
        bind:value={syncSetting.endpoint}
    />
</InputRow>
<InfoNote warning visible={isEndpointInsecure}
    >{translateMessage("Only secure (HTTPS) connections can be used on Obsidian Mobile.")}</InfoNote
>
<InputRow label={translateMessage("Access Key ID")}>
    <input
        type="text"
        name="s3-access-key-id"
        placeholder={translateMessage("Enter your Access Key ID")}
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        required
        bind:value={syncSetting.accessKey}
    />
</InputRow>
<InputRow label={translateMessage("Secret Access Key")}>
    <Password
        name="s3-secret-access-key"
        placeholder={translateMessage("Enter your Secret Access Key")}
        required
        bind:value={syncSetting.secretKey}
    />
</InputRow>
<InputRow label={translateMessage("Bucket Name")}>
    <input
        type="text"
        name="s3-bucket-name"
        placeholder={translateMessage("Enter your Bucket Name")}
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        required
        bind:value={syncSetting.bucket}
    /></InputRow
>
<InputRow label={translateMessage("Folder Prefix")}>
    <input
        type="text"
        name="s3-folder-prefix"
        placeholder={translateMessage("Optional, e.g. my-vault/")}
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        bind:value={syncSetting.bucketPrefix}
    />
</InputRow>
<InfoNote>
    {translateMessage("Use a folder prefix to keep several vaults in one bucket. Leave it blank to use the bucket root.")}
</InfoNote>

<InputRow label={translateMessage("Size warning (MB)")}>
    <input type="number" name="s3-size-warning" min="0" step="100" bind:value={sizeWarning} />
</InputRow>
<InfoNote>
    {translateMessage("Warn when the data in the bucket grows beyond this size. Leave it at 0 for no warning.")}
</InfoNote>

<InfoNote error visible={error !== ""}>
    {error}
</InfoNote>

{#if processing}
    {translateMessage("Checking connection... Please wait.")}
{:else}
    <UserDecisions>
        <Decision
            title={translateMessage("Test Settings and Continue")}
            important
            disabled={!canProceed}
            commit={() => checkAndCommit()}
        />
        <Decision title={translateMessage("Continue anyway")} commit={() => commit()} />
        <Decision title={translateMessage("Cancel")} commit={() => cancel()} />
    </UserDecisions>
{/if}
