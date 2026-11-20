<script lang="ts">
    import DialogHeader from "@/modules/services/LiveSyncUI/components/DialogHeader.svelte";
    import Password from "@/modules/services/LiveSyncUI/components/Password.svelte";
    import type { GuestDialogProps } from "@/modules/services/LiveSyncUI/svelteDialog";
    import { emptySetupFormValues, validateSetupForm } from "@/serviceFeatures/setupObsidian/setupForm";
    import type { ObsidianLiveSyncSettings } from "@vrtmrz/livesync-commonlib/compat/common/types";
    import { untrack } from "svelte";
    import type { SetupFormInitialData, SetupFormResultType } from "./setupDialogTypes";

    type Props = GuestDialogProps<SetupFormResultType, SetupFormInitialData>;
    const { setResult, getInitialData }: Props = $props();

    // The form is opened once with fixed initial data.
    const initial = untrack(() => getInitialData?.());
    const mode = initial?.mode ?? "new";
    let values = $state({ ...emptySetupFormValues(), ...initial?.values });
    let confirmPassphrase = $state("");
    let busy = $state(false);
    let error = $state("");
    let confirmation = $state<{ message: string; label: string; settings: ObsidianLiveSyncSettings } | undefined>(
        undefined
    );

    const isNew = mode === "new";
    const title = isNew ? "Start a new sync" : "Join an existing sync";
    const lead = isNew
        ? "This vault will be uploaded to your bucket. Other devices can then join it."
        : "Your notes will be downloaded from the bucket and merged with anything already in this vault.";
    const submitLabel = $derived(
        busy ? "Connecting…" : (confirmation?.label ?? (isNew ? "Upload this vault" : "Download from R2"))
    );

    function edited() {
        error = "";
        confirmation = undefined;
    }

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (busy) return;
        if (confirmation) {
            setResult({ settings: confirmation.settings });
            return;
        }
        const problem = validateSetupForm(values, mode, confirmPassphrase);
        if (problem) {
            error = problem;
            return;
        }
        if (!initial) return;
        busy = true;
        error = "";
        try {
            const result = await initial.prepare($state.snapshot(values));
            if (result.status === "ok") {
                setResult({ settings: result.settings });
            } else if (result.status === "confirm") {
                confirmation = { message: result.message, label: result.confirmLabel, settings: result.settings };
            } else {
                error = result.message;
            }
        } catch (e) {
            error = `Could not connect: ${e instanceof Error ? e.message : String(e)}`;
        } finally {
            busy = false;
        }
    }
</script>

<DialogHeader {title} />
<form class="rs-setup" onsubmit={submit} oninput={edited} autocomplete="off">
    <p class="rs-setup-lead">{lead}</p>

    <section class="rs-section">
        <h3 class="rs-section-title">Cloudflare R2</h3>
        <div class="rs-field">
            <label class="rs-field-label" for="rs-endpoint">Endpoint URL</label>
            <input
                id="rs-endpoint"
                type="text"
                placeholder="https://<account-id>.r2.cloudflarestorage.com"
                spellcheck="false"
                autocapitalize="off"
                bind:value={values.endpoint}
            />
        </div>
        <div class="rs-field">
            <label class="rs-field-label" for="rs-access-key">Access Key ID</label>
            <input
                id="rs-access-key"
                type="text"
                spellcheck="false"
                autocapitalize="off"
                bind:value={values.accessKey}
            />
        </div>
        <div class="rs-field">
            <span class="rs-field-label">Secret Access Key</span>
            <div class="rs-password"><Password name="rs-secret-key" placeholder="" bind:value={values.secretKey} /></div>
        </div>
        <div class="rs-field-pair">
            <div class="rs-field">
                <label class="rs-field-label" for="rs-bucket">Bucket</label>
                <input id="rs-bucket" type="text" spellcheck="false" autocapitalize="off" bind:value={values.bucket} />
            </div>
            <div class="rs-field">
                <label class="rs-field-label" for="rs-prefix">Folder <span class="rs-optional">optional</span></label>
                <input
                    id="rs-prefix"
                    type="text"
                    placeholder="my-vault/"
                    spellcheck="false"
                    autocapitalize="off"
                    bind:value={values.bucketPrefix}
                />
            </div>
        </div>
        <p class="rs-hint">
            Create keys in the Cloudflare dashboard under R2 › Manage API tokens, with Object Read &amp; Write access to
            this bucket.
        </p>
    </section>

    <section class="rs-section">
        <h3 class="rs-section-title">Encryption</h3>
        <div class="rs-toggle-row">
            <div class="rs-toggle-text">
                <span class="rs-field-label">Encrypt notes</span>
                <span class="rs-hint">Notes are encrypted on this device before upload.</span>
            </div>
            <label class="checkbox-container" class:is-enabled={values.encrypt}>
                <input type="checkbox" bind:checked={values.encrypt} aria-label="Encrypt notes" />
            </label>
        </div>
        {#if values.encrypt}
            <div class="rs-field">
                <span class="rs-field-label">Passphrase</span>
                <div class="rs-password"><Password name="rs-passphrase" placeholder="" bind:value={values.passphrase} /></div>
            </div>
            {#if isNew}
                <div class="rs-field">
                    <span class="rs-field-label">Confirm passphrase</span>
                    <div class="rs-password">
                        <Password name="rs-passphrase-confirm" placeholder="" bind:value={confirmPassphrase} />
                    </div>
                </div>
            {/if}
            <p class="rs-hint">
                {isNew
                    ? "Every device needs this passphrase. If it is lost, the data in the bucket cannot be recovered."
                    : "Use the same passphrase as your other devices."}
            </p>
            <div class="rs-toggle-row">
                <div class="rs-toggle-text">
                    <span class="rs-field-label">Hide file names</span>
                    <span class="rs-hint">Also hides folder structure, sizes, and timestamps.</span>
                </div>
                <label class="checkbox-container" class:is-enabled={values.usePathObfuscation}>
                    <input type="checkbox" bind:checked={values.usePathObfuscation} aria-label="Hide file names" />
                </label>
            </div>
        {/if}
    </section>

    <section class="rs-section">
        <h3 class="rs-section-title">Options</h3>
        <div class="rs-toggle-row">
            <div class="rs-toggle-text">
                <label class="rs-field-label" for="rs-size-warning">Bucket size warning (MB)</label>
                <span class="rs-hint">Warn when the bucket grows beyond this size. 0 means never.</span>
            </div>
            <input id="rs-size-warning" class="rs-number" type="number" min="0" step="100" bind:value={values.sizeWarning} />
        </div>
    </section>

    {#if error}
        <p class="rs-message rs-message-error" role="alert">{error}</p>
    {/if}
    {#if confirmation}
        <p class="rs-message rs-message-warning" role="alert">{confirmation.message}</p>
    {/if}

    <div class="rs-actions">
        <button type="button" onclick={() => setResult("back")} disabled={busy}>Back</button>
        <button type="submit" class="mod-cta" class:mod-warning={!!confirmation} disabled={busy}>{submitLabel}</button>
    </div>
</form>
