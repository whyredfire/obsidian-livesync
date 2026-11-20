<script lang="ts">
    import DialogHeader from "@/modules/services/LiveSyncUI/components/DialogHeader.svelte";
    import Password from "@/modules/services/LiveSyncUI/components/Password.svelte";
    import type { GuestDialogProps } from "@/modules/services/LiveSyncUI/svelteDialog";
    import { untrack } from "svelte";
    import {
        TYPE_CANCELLED,
        type CopySetupURIInitialData,
        type CopySetupURIResultType,
        type CreatedSetupURI,
    } from "./setupDialogTypes";

    type Props = GuestDialogProps<CopySetupURIResultType, CopySetupURIInitialData>;
    const { setResult, getInitialData }: Props = $props();

    const initial = untrack(() => getInitialData?.());
    const canExpire = !!initial?.expires;

    let passphrase = $state("");
    let timeBound = $state(canExpire);
    let busy = $state(false);
    let error = $state("");
    let created = $state<CreatedSetupURI | undefined>(undefined);
    let copied = $state(false);

    function edited() {
        error = "";
        created = undefined;
        copied = false;
    }

    async function copy(uri: string) {
        try {
            await navigator.clipboard.writeText(uri);
            copied = true;
        } catch {
            copied = false;
            error = "The link could not be copied automatically. Select it and copy it yourself.";
        }
    }

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (busy || !initial) return;
        if (created) {
            setResult("done");
            return;
        }
        if (!passphrase) {
            error = "Enter a passphrase to protect the link.";
            return;
        }
        busy = true;
        error = "";
        try {
            created = await initial.create(passphrase, timeBound);
            await copy(created.uri);
        } catch (e) {
            error = e instanceof Error ? e.message : String(e);
        } finally {
            busy = false;
        }
    }
</script>

<DialogHeader title="Copy setup URI" />
<form class="rs-setup" onsubmit={submit} oninput={edited} autocomplete="off">
    <p class="rs-setup-lead">
        Create a link which sets up another device with this bucket and encryption settings. On that device, choose Use a
        setup URI and paste it.
    </p>
    <section class="rs-section">
        <div class="rs-field">
            <span class="rs-field-label">Passphrase</span>
            <div class="rs-password"><Password name="rs-uri-passphrase" placeholder="" bind:value={passphrase} /></div>
            <span class="rs-hint">The link is encrypted with this passphrase. Enter it on the other device to open the link.</span>
        </div>
        {#if canExpire}
            <div class="rs-toggle-row">
                <div class="rs-toggle-text">
                    <span class="rs-field-label">Expire this week</span>
                    <span class="rs-hint">
                        {timeBound ? `The link stops working on ${initial?.expires}.` : "The link has no time limit."}
                    </span>
                </div>
                <label class="checkbox-container" class:is-enabled={timeBound}>
                    <input type="checkbox" bind:checked={timeBound} aria-label="Expire this week" />
                </label>
            </div>
        {:else}
            <p class="rs-hint">This device's clock is not valid, so the link will not expire.</p>
        {/if}
    </section>
    {#if created}
        <section class="rs-section">
            <textarea class="rs-uri" readonly rows="4" onfocus={(e) => e.currentTarget.select()}>{created.uri}</textarea>
            {#if copied}
                <p class="rs-message rs-message-success" role="status">Copied to the clipboard.</p>
            {/if}
        </section>
    {/if}
    {#if error}
        <p class="rs-message rs-message-error" role="alert">{error}</p>
    {/if}
    <div class="rs-actions">
        {#if created}
            <button type="button" onclick={() => created && copy(created.uri)}>Copy again</button>
            <button type="submit" class="mod-cta">Done</button>
        {:else}
            <button type="button" onclick={() => setResult(TYPE_CANCELLED)} disabled={busy}>Cancel</button>
            <button type="submit" class="mod-cta" disabled={busy}>{busy ? "Creating…" : "Create and copy"}</button>
        {/if}
    </div>
</form>
