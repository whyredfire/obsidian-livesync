<script lang="ts">
    import DialogHeader from "@/modules/services/LiveSyncUI/components/DialogHeader.svelte";
    import Guidance from "@/modules/services/LiveSyncUI/components/Guidance.svelte";
    import Decision from "@/modules/services/LiveSyncUI/components/Decision.svelte";
    import Question from "@/modules/services/LiveSyncUI/components/Question.svelte";
    import Option from "@/modules/services/LiveSyncUI/components/Option.svelte";
    import Options from "@/modules/services/LiveSyncUI/components/Options.svelte";
    import Instruction from "@/modules/services/LiveSyncUI/components/Instruction.svelte";
    import UserDecisions from "@/modules/services/LiveSyncUI/components/UserDecisions.svelte";
    import InfoNote from "@/modules/services/LiveSyncUI/components/InfoNote.svelte";
    import { $msg as translateMessage } from "@/common/translation";
    import {
        TYPE_BACKUP_SKIPPED,
        TYPE_CANCEL,
        TYPE_IDENTICAL,
        TYPE_INDEPENDENT,
        TYPE_UNBALANCED,
        type FetchEverythingResult,
        type ResultTypeVault,
    } from "./setupDialogTypes";

    type Props = {
        setResult: (result: FetchEverythingResult) => void;
    };
    const { setResult }: Props = $props();
    let vaultType = $state<ResultTypeVault>(TYPE_CANCEL);
    const canProceed = $derived(
        vaultType === TYPE_IDENTICAL || vaultType === TYPE_INDEPENDENT || vaultType === TYPE_UNBALANCED
    );

    function commit() {
        // Keep this device's settings; they already match the bucket's configuration.
        setResult({ vault: vaultType, backup: TYPE_BACKUP_SKIPPED, extra: { preventFetchingConfig: true } });
    }
</script>

<DialogHeader title={translateMessage("Reset Synchronisation on This Device")} />
<Guidance
    >{translateMessage(
        "This will rebuild the local database on this device using the most recent data from the server. This action is designed to resolve synchronisation inconsistencies and restore correct functionality."
    )}</Guidance
>
<Guidance important title={translateMessage("Important Notice")}>
    <strong
        >{translateMessage(
            "If you have unsynchronised changes in your Vault on this device, they will likely diverge from the server's versions after the reset. This may result in a large number of file conflicts."
        )}</strong
    ><br />
    {translateMessage(
        "Furthermore, if conflicts are already present in the server data, they will be synchronised to this device as they are, and you will need to resolve them locally."
    )}
</Guidance>
<hr />
<Instruction>
    <Question
        ><strong>{translateMessage("To minimise the creation of new conflicts")}</strong>{translateMessage(
            ", please select the option that best describes the current state of your Vault. The application will then check your files in the most appropriate way based on your selection."
        )}</Question
    >
    <Options>
        <Option
            selectedValue={TYPE_IDENTICAL}
            title={translateMessage("The files in this Vault are almost identical to the server's.")}
            bind:value={vaultType}
        >
            {translateMessage(
                "(e.g., immediately after restoring on another computer, or having recovered from a backup)"
            )}
        </Option>
        <Option
            selectedValue={TYPE_INDEPENDENT}
            title={translateMessage("This Vault is empty, or contains only new files that are not on the server.")}
            bind:value={vaultType}
        >
            {translateMessage("(e.g., setting up for the first time on a new smartphone, starting from a clean slate)")}
        </Option>
        <Option
            selectedValue={TYPE_UNBALANCED}
            title={translateMessage("There may be differences between the files in this Vault and the server.")}
            bind:value={vaultType}
        >
            {translateMessage("(e.g., after editing many files whilst offline)")}
            <InfoNote info>
                {translateMessage(
                    "In this scenario, Red Sync will recreate metadata for every file and deliberately generate conflicts. Where the file content is identical, these conflicts will be resolved automatically."
                )}
            </InfoNote>
        </Option>
    </Options>
</Instruction>
<InfoNote>
    {translateMessage(
        "If this vault contains notes you cannot afford to lose, copy the vault folder somewhere safe before continuing."
    )}
</InfoNote>
<UserDecisions>
    <Decision
        title={translateMessage("Reset and Resume Synchronisation")}
        important
        disabled={!canProceed}
        commit={() => commit()}
    />
    <Decision title={translateMessage("Cancel")} commit={() => setResult(TYPE_CANCEL)} />
</UserDecisions>
