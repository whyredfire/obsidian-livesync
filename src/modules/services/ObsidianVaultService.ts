import { getPathFromTFile, isValidPath } from "@/common/utils";
import { InjectableVaultService } from "@vrtmrz/livesync-commonlib/compat/services/implements/injectable/InjectableVaultService";
import type { ObsidianServiceContext } from "@/modules/services/ObsidianServiceContext";
import type { FilePath } from "@vrtmrz/livesync-commonlib/compat/common/types";

declare module "obsidian" {
    interface DataAdapter {
        insensitive?: boolean;
    }
}

// InjectableVaultService
export class ObsidianVaultService extends InjectableVaultService<ObsidianServiceContext> {
    override vaultName(): string {
        // Suffixed so that the local databases never collide with Self-hosted LiveSync
        // installed in the same vault.
        return `${this.context.app.vault.getName()}-redsync`;
    }
    getActiveFilePath(): FilePath | undefined {
        const file = this.context.app.workspace.getActiveFile();
        if (file) {
            return getPathFromTFile(file);
        }
        return undefined;
    }
    isStorageInsensitive(): boolean {
        return this.context.app.vault.adapter.insensitive ?? true;
    }

    override shouldCheckCaseInsensitively(): boolean {
        // If the storage is insensitive, always return false, that because no need to check again.
        if (this.isStorageInsensitive()) return false;
        return super.shouldCheckCaseInsensitively(); // Check the setting
    }
    override isValidPath(path: string): boolean {
        return isValidPath(path);
    }
}
