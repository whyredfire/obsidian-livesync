<script lang="ts">
    import { configURIBase } from "@/common/types";
    import DialogHeader from "@/modules/services/LiveSyncUI/components/DialogHeader.svelte";
    import Password from "@/modules/services/LiveSyncUI/components/Password.svelte";
    import { onMount } from "svelte";
    import { decodeSettingsFromSetupURI } from "@vrtmrz/livesync-commonlib/compat/API/processSetting";
    import type { GuestDialogProps } from "@/modules/services/LiveSyncUI/svelteDialog";
    import { TYPE_CANCELLED, type UseSetupURIResultType } from "./setupDialogTypes";

    type Props = GuestDialogProps<UseSetupURIResultType, string>;
    const { setResult, getInitialData }: Props = $props();

    let setupURI = $state("");
    let passphrase = $state("");
    let error = $state("");
    let busy = $state(false);
    onMount(() => {
        const initialURI = getInitialData?.();
        if (initialURI) setupURI = initialURI;
    });

    const looksValid = $derived(setupURI.trim().startsWith(configURIBase));

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        error = "";
        if (!looksValid) {
            error = "This does not look like a Red Sync setup URI. Copy it again from the other device.";
            return;
        }
        if (!passphrase) {
            error = "Enter the passphrase that was chosen when the setup URI was copied.";
            return;
        }
        busy = true;
        try {
            const settings = await decodeSettingsFromSetupURI(setupURI.trim(), passphrase);
            if (!settings) throw new Error("Invalid setup URI");
            setResult(settings);
        } catch {
            error = "The setup URI could not be opened. Check the passphrase and try again.";
        } finally {
            busy = false;
        }
    }
</script>

<DialogHeader title="Use a setup URI" />
<form class="rs-setup" onsubmit={submit} oninput={() => (error = "")} autocomplete="off">
    <p class="rs-setup-lead">
        On a device that is already syncing, open Red Sync's settings and choose Copy setup URI. Paste it here with the
        passphrase you chose for it. On a phone, you can also scan the other device's QR code with the camera.
    </p>
    <section class="rs-section">
        <div class="rs-field">
            <label class="rs-field-label" for="rs-setup-uri">Setup URI</label>
            <input
                id="rs-setup-uri"
                type="text"
                placeholder="obsidian://setuplivesync?settings=…"
                spellcheck="false"
                autocapitalize="off"
                bind:value={setupURI}
            />
        </div>
        <div class="rs-field">
            <span class="rs-field-label">Passphrase</span>
            <div class="rs-password"><Password name="rs-uri-passphrase" placeholder="" bind:value={passphrase} /></div>
        </div>
    </section>
    {#if error}
        <p class="rs-message rs-message-error" role="alert">{error}</p>
    {/if}
    <div class="rs-actions">
        <button type="button" onclick={() => setResult(TYPE_CANCELLED)} disabled={busy}>Cancel</button>
        <button type="submit" class="mod-cta" disabled={busy}>{busy ? "Opening…" : "Continue"}</button>
    </div>
</form>
