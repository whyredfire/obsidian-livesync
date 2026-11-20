<script lang="ts">
    import DialogHeader from "@/modules/services/LiveSyncUI/components/DialogHeader.svelte";
    import { TYPE_CANCELLED, type SetupStartResultType } from "./setupDialogTypes";

    type Props = {
        setResult: (result: SetupStartResultType) => void;
    };
    const { setResult }: Props = $props();

    const choices: { value: SetupStartResultType; title: string; description: string }[] = [
        {
            value: "new",
            title: "Start a new sync",
            description: "Upload this vault to your Cloudflare R2 bucket. Choose this on your first device.",
        },
        {
            value: "join",
            title: "Join an existing sync",
            description: "Download your notes from the R2 bucket into this vault, then keep them in sync.",
        },
        {
            value: "uri",
            title: "Use a setup URI",
            description: "Paste the link copied from a device that is already syncing, so you do not have to type the details.",
        },
    ];
</script>

<DialogHeader title="Set up Red Sync" />
<div class="rs-setup">
    <p class="rs-setup-lead">Sync this vault through your own Cloudflare R2 bucket.</p>
    <div class="rs-choices">
        {#each choices as choice (choice.value)}
            <button type="button" class="rs-choice" onclick={() => setResult(choice.value)}>
                <span class="rs-choice-title">{choice.title}</span>
                <span class="rs-choice-description">{choice.description}</span>
            </button>
        {/each}
    </div>
    <div class="rs-actions">
        <button type="button" onclick={() => setResult(TYPE_CANCELLED)}>Cancel</button>
    </div>
</div>
