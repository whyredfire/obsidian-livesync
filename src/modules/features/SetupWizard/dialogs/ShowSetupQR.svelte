<script lang="ts">
    import DialogHeader from "@/modules/services/LiveSyncUI/components/DialogHeader.svelte";
    import type { GuestDialogProps } from "@/modules/services/LiveSyncUI/svelteDialog";
    import { untrack } from "svelte";
    import { TYPE_CANCELLED, type ShowSetupQRInitialData, type ShowSetupQRResultType } from "./setupDialogTypes";

    type Props = GuestDialogProps<ShowSetupQRResultType, ShowSetupQRInitialData>;
    const { setResult, getInitialData }: Props = $props();

    const parts = untrack(() => getInitialData?.()?.parts ?? []);
    const multiPart = parts.length > 1;
    let index = $state(0);
    let revealed = $state(false);

    const imageSource = $derived(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(parts[index] ?? "")}`);
    const isLast = $derived(index >= parts.length - 1);
</script>

<DialogHeader title="Set up another device" />
<div class="rs-setup">
    {#if multiPart}
        <p class="rs-setup-lead">
            Your settings are too large for one code, so they are split into {parts.length}. Scan each code in turn with
            your other device's camera and open the page it shows. When the last part has been scanned, the page opens
            Obsidian with Red Sync and joins this sync. The settings stay on your devices.
        </p>
    {:else}
        <p class="rs-setup-lead">
            Install Red Sync on your other device, then scan this code with its camera. Obsidian opens and joins this
            sync.
        </p>
    {/if}
    <div class="rs-qr-card">
        {#if revealed}
            <img class="rs-qr" src={imageSource} alt="Setup QR code" />
        {:else}
            <button type="button" class="rs-qr-reveal" onclick={() => (revealed = true)}>Show code</button>
        {/if}
        {#if multiPart}
            <span class="rs-hint">Part {index + 1} of {parts.length}</span>
        {/if}
    </div>
    <p class="rs-message rs-message-warning">
        The code contains your R2 keys and encryption passphrase without protection. Show it only to your own devices.
    </p>
    <div class="rs-actions">
        {#if multiPart && index > 0}
            <button type="button" onclick={() => (index -= 1)}>Back</button>
        {/if}
        {#if multiPart && !isLast}
            <button type="button" onclick={() => setResult(TYPE_CANCELLED)}>Cancel</button>
            <button type="button" class="mod-cta" onclick={() => (index += 1)}>Next</button>
        {:else}
            <button type="button" class="mod-cta" onclick={() => setResult("done")}>Done</button>
        {/if}
    </div>
</div>
