import { LOG_LEVEL_URGENT, Logger } from "octagonal-wheels/common/logger";
import {
    ServiceRebuilder,
    type ServiceRebuilderDependencies,
} from "@vrtmrz/livesync-commonlib/compat/serviceModules/Rebuilder";
import { UnsupportedEncryptedDocumentFormatError } from "@vrtmrz/livesync-commonlib/replication";

export class ObsidianRebuilder extends ServiceRebuilder {
    constructor(services: ServiceRebuilderDependencies) {
        super(services);
    }

    /** Red Sync has no optional features (Customisation Sync, Hidden File Sync) to mention. */
    override informOptionalFeatures(): Promise<void> {
        return Promise.resolve();
    }

    override $fetchLocal(makeLocalChunkBeforeSync?: boolean, preventMakeLocalFilesBeforeSync?: boolean): Promise<void> {
        return this.reportFetchFailure(super.$fetchLocal(makeLocalChunkBeforeSync, preventMakeLocalFilesBeforeSync));
    }

    override $fetchLocalDBFast(autoResume: boolean): Promise<void> {
        return this.reportFetchFailure(super.$fetchLocalDBFast(autoResume));
    }

    private async reportFetchFailure(fetch: Promise<void>): Promise<void> {
        try {
            await fetch;
        } catch (error) {
            if (UnsupportedEncryptedDocumentFormatError.findIn(error)) {
                Logger(
                    "The download stopped: the data in R2 uses an encryption format Red Sync cannot read. On a device which has all your notes, use 'Overwrite R2 with this device', then download again here.",
                    LOG_LEVEL_URGENT
                );
            }
            throw error;
        }
    }
}
