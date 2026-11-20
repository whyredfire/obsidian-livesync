<script lang="ts">
    import DialogHeader from "@/modules/services/LiveSyncUI/components/DialogHeader.svelte";
    import Guidance from "@/modules/services/LiveSyncUI/components/Guidance.svelte";
    import Decision from "@/modules/services/LiveSyncUI/components/Decision.svelte";
    import Question from "@/modules/services/LiveSyncUI/components/Question.svelte";
    import Instruction from "@/modules/services/LiveSyncUI/components/Instruction.svelte";
    import PlaintextReceiptWarning from "./PlaintextReceiptWarning.svelte";
    import UserDecisions from "@/modules/services/LiveSyncUI/components/UserDecisions.svelte";
    import { $msg as msg } from "@/common/translation";
    import {
        TYPE_APPLY,
        TYPE_CANCELLED,
        type OutroApplyInitialData,
        type OutroNewUserResultType,
    } from "./setupDialogTypes";

    type Props = {
        setResult: (result: OutroNewUserResultType) => void;
        getInitialData?: () => OutroApplyInitialData | undefined;
    };
    const { setResult, getInitialData }: Props = $props();
    const enableUnencryptedContent = $derived(getInitialData?.()?.enableUnencryptedContent === true);
    // let userType = $state<OutroNewUserResultType>(TYPE_CANCELLED);
</script>

<DialogHeader title={msg("Setup Complete: Preparing to Initialise Server")} />
<Guidance>
    <p>
        {msg("The connection to the server has been configured successfully. As the next step,")} <strong
            >{msg(
                "the synchronisation data on the server will be built based on the current data on this device."
            )}</strong
        >
    </p>
    <p>
        <strong>{msg("IMPORTANT")}</strong>
        <br />
        {msg(
            "After restarting, the data on this device will be uploaded to the server as the 'master copy'. Please be aware that any unintended data currently on the server will be completely overwritten."
        )}
    </p>
    <p>{msg("When the upload has finished, turn on Automatic sync in the Red Sync settings.")}</p>
    {#if enableUnencryptedContent}
        <PlaintextReceiptWarning />
    {/if}
</Guidance>
<Instruction>
    <Question>{msg("Please select the button below to restart and proceed to the final confirmation.")}</Question>
</Instruction>
<UserDecisions>
    <Decision
        title={msg("Restart and Initialise Server")}
        important={true}
        commit={() => setResult(TYPE_APPLY)}
    />
    <Decision title={msg("No, please take me back")} commit={() => setResult(TYPE_CANCELLED)} />
</UserDecisions>
