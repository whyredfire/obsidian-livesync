<script lang="ts">
    import DialogHeader from "@/modules/services/LiveSyncUI/components/DialogHeader.svelte";
    import Guidance from "@/modules/services/LiveSyncUI/components/Guidance.svelte";
    import Decision from "@/modules/services/LiveSyncUI/components/Decision.svelte";
    import UserDecisions from "@/modules/services/LiveSyncUI/components/UserDecisions.svelte";
    import InfoNote from "@/modules/services/LiveSyncUI/components/InfoNote.svelte";
    import { $msg as msg } from "@/common/translation";
    import { TYPE_BACKUP_SKIPPED, TYPE_CANCEL, type RebuildEverythingResult } from "./setupDialogTypes";

    type Props = {
        setResult: (result: RebuildEverythingResult) => void;
    };
    const { setResult }: Props = $props();

    function commit() {
        // This device's settings are authoritative when it uploads the master copy.
        setResult({ backup: TYPE_BACKUP_SKIPPED, extra: { preventFetchingConfig: true } });
    }
</script>

<DialogHeader title={msg("Upload this vault to R2")} />
<Guidance>
    {msg(
        "This vault will be uploaded to the bucket as the master copy. Anything already stored in the bucket is deleted first."
    )}
</Guidance>
<InfoNote warning>
    {msg(
        "Other devices will need to fetch from R2 again afterwards. If this vault contains notes you cannot afford to lose, copy the vault folder somewhere safe first."
    )}
</InfoNote>
<UserDecisions>
    <Decision title={msg("Upload this vault")} important commit={() => commit()} />
    <Decision title={msg("Cancel")} commit={() => setResult(TYPE_CANCEL)} />
</UserDecisions>
