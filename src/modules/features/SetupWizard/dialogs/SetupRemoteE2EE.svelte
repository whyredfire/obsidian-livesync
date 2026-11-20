<script lang="ts">
    import DialogHeader from "@/modules/services/LiveSyncUI/components/DialogHeader.svelte";
    import Guidance from "@/modules/services/LiveSyncUI/components/Guidance.svelte";
    import Decision from "@/modules/services/LiveSyncUI/components/Decision.svelte";
    import UserDecisions from "@/modules/services/LiveSyncUI/components/UserDecisions.svelte";
    import InfoNote from "@/modules/services/LiveSyncUI/components/InfoNote.svelte";
    import InputRow from "@/modules/services/LiveSyncUI/components/InputRow.svelte";
    import Password from "@/modules/services/LiveSyncUI/components/Password.svelte";
    import { DEFAULT_SETTINGS, type EncryptionSettings } from "@vrtmrz/livesync-commonlib/compat/common/types";
    import { deriveIdKey, ID_DERIVATION_VERSION } from "@vrtmrz/livesync-commonlib/settings";
    import { onMount } from "svelte";
    import type { GuestDialogProps } from "@/modules/services/LiveSyncUI/svelteDialog";
    import { copyTo, pickEncryptionSettings } from "@vrtmrz/livesync-commonlib/compat/common/utils";
    import {
        TYPE_CANCELLED,
        type SetupRemoteE2EEInitialData,
        type SetupRemoteE2EEResultType,
    } from "./setupDialogTypes";
    import { $msg as translateMessage } from "@/common/translation";

    type Props = GuestDialogProps<SetupRemoteE2EEResultType, SetupRemoteE2EEInitialData>;
    const { setResult, getInitialData }: Props = $props();

    let encryptionSettings = $state<EncryptionSettings>({
        encrypt: false,
        passphrase: "",
        E2EEAlgorithm: DEFAULT_SETTINGS.E2EEAlgorithm,
        usePathObfuscation: true,
        encryptInternalMetadata: false,
        acceptUnencryptedContent: DEFAULT_SETTINGS.acceptUnencryptedContent,
        idDerivationVersion: 0,
        idDerivationKey: "",
    });
    let originalPassphrase = "";
    let error = $state("");
    let processing = $state(false);

    onMount(() => {
        const initialData = getInitialData?.();
        if (initialData) {
            copyTo(initialData.settings, encryptionSettings);
            originalPassphrase = initialData.settings.passphrase;
        }
    });

    const canCommit = $derived(!encryptionSettings.encrypt || encryptionSettings.passphrase.trim().length > 0);

    async function commit() {
        error = "";
        const result = pickEncryptionSettings(encryptionSettings);
        if (result.encrypt) {
            const keyMissing = result.idDerivationVersion !== ID_DERIVATION_VERSION || !result.idDerivationKey;
            if (keyMissing || result.passphrase !== originalPassphrase) {
                // Derive the ID key from the passphrase, so that every device configured
                // with the same passphrase produces identical document and chunk IDs.
                processing = true;
                try {
                    result.idDerivationKey = await deriveIdKey(result.passphrase);
                    result.idDerivationVersion = ID_DERIVATION_VERSION;
                } catch (e) {
                    error = translateMessage("Failed to derive the encryption key: ${reason}", { reason: `${e}` });
                    return;
                } finally {
                    processing = false;
                }
            }
        }
        setResult(result);
    }
</script>

<DialogHeader title={translateMessage("Encryption")} />
<Guidance>
    {translateMessage(
        "When enabled, notes are encrypted on this device before they are uploaded, so the bucket only stores data that cannot be read without your passphrase."
    )}
</Guidance>
<InputRow label={translateMessage("Encrypt data")}>
    <input type="checkbox" bind:checked={encryptionSettings.encrypt} />
</InputRow>
{#if encryptionSettings.encrypt}
    <InputRow label={translateMessage("Passphrase")}>
        <Password
            name="e2ee-passphrase"
            placeholder={translateMessage("Enter your passphrase")}
            bind:value={encryptionSettings.passphrase}
            required
        />
    </InputRow>
    <InfoNote warning>
        {translateMessage(
            "Use the same passphrase on every device. If you lose it, the data in the bucket cannot be recovered."
        )}
    </InfoNote>
    <InputRow label={translateMessage("Obfuscate file paths")}>
        <input type="checkbox" bind:checked={encryptionSettings.usePathObfuscation} />
    </InputRow>
    <InfoNote>
        {translateMessage(
            "Also hides file names, folder structure, sizes, and timestamps from the bucket."
        )}
    </InfoNote>
{/if}
<InfoNote error visible={error !== ""}>{error}</InfoNote>
{#if processing}
    {translateMessage("Deriving keys... Please wait.")}
{:else}
    <UserDecisions>
        <Decision
            title={translateMessage("Continue")}
            important
            disabled={!canCommit}
            commit={() => commit()}
        />
        <Decision title={translateMessage("Cancel")} commit={() => setResult(TYPE_CANCELLED)} />
    </UserDecisions>
{/if}
