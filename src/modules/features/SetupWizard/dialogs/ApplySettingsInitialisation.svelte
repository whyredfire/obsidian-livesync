<script lang="ts">
    import DialogHeader from "@/modules/services/LiveSyncUI/components/DialogHeader.svelte";
    import Guidance from "@/modules/services/LiveSyncUI/components/Guidance.svelte";
    import Decision from "@/modules/services/LiveSyncUI/components/Decision.svelte";
    import Question from "@/modules/services/LiveSyncUI/components/Question.svelte";
    import Option from "@/modules/services/LiveSyncUI/components/Option.svelte";
    import Instruction from "@/modules/services/LiveSyncUI/components/Instruction.svelte";
    import UserDecisions from "@/modules/services/LiveSyncUI/components/UserDecisions.svelte";
    import InfoNote from "@/modules/services/LiveSyncUI/components/InfoNote.svelte";
    import { $msg as msg } from "@/common/translation";
    import {
        type ApplySettingsInitialisationResultType,
        TYPE_CANCELLED,
        TYPE_FETCH,
        TYPE_REBUILD,
    } from "./setupDialogTypes";

    type Props = {
        setResult: (result: ApplySettingsInitialisationResultType) => void;
    };
    const { setResult }: Props = $props();
    let selectedMode = $state<ApplySettingsInitialisationResultType>(TYPE_CANCELLED);
    const canProceed = $derived(selectedMode === TYPE_FETCH || selectedMode === TYPE_REBUILD);
    const proceedMessage = $derived.by(() => {
        if (selectedMode === TYPE_FETCH) {
            return msg("Ui.SetupWizard.ApplySettingsInitialisation.ProceedFetch");
        }
        if (selectedMode === TYPE_REBUILD) {
            return msg("Ui.SetupWizard.ApplySettingsInitialisation.ProceedRebuild");
        }
        return msg("Ui.SetupWizard.Common.ProceedSelectOption");
    });
</script>

<DialogHeader title={msg("Ui.SetupWizard.ApplySettingsInitialisation.Title")} />
<Guidance>
    <p>{msg("Ui.SetupWizard.ApplySettingsInitialisation.Guidance")}</p>
</Guidance>
<Instruction>
    <Question>{msg("Ui.SetupWizard.ApplySettingsInitialisation.Question")}</Question>
    <Option
        title={msg("Ui.SetupWizard.ApplySettingsInitialisation.FetchOption")}
        bind:value={selectedMode}
        selectedValue={TYPE_FETCH}
    >
        <InfoNote notice>
            {msg("Ui.SetupWizard.ApplySettingsInitialisation.FetchOptionDesc")}
        </InfoNote>
    </Option>
    <Option
        title={msg("Ui.SetupWizard.ApplySettingsInitialisation.RebuildOption")}
        bind:value={selectedMode}
        selectedValue={TYPE_REBUILD}
    >
        <InfoNote warning>
            {msg("Ui.SetupWizard.ApplySettingsInitialisation.RebuildOptionDesc")}
        </InfoNote>
    </Option>
</Instruction>
<UserDecisions>
    <Decision
        title={proceedMessage}
        important={selectedMode !== TYPE_REBUILD}
        destructive={selectedMode === TYPE_REBUILD}
        disabled={!canProceed}
        commit={() => setResult(selectedMode)}
    />
    <Decision
        title={msg("Ui.SetupWizard.ApplySettingsInitialisation.Back")}
        commit={() => setResult(TYPE_CANCELLED)}
    />
</UserDecisions>
