type LegacyBulkChunkPreSendSettings = {
    sendChunksBulk: boolean;
    sendChunksBulkMaxSize: number;
};

/**
 * Disables the removed automatic bulk chunk pre-send option in persisted settings.
 *
 * The field remains readable only so older settings and Setup URIs can be migrated to the supported behaviour.
 *
 * @returns `true` when the legacy setting was enabled and has been changed.
 */
export function disableLegacyBulkChunkPreSend(settings: LegacyBulkChunkPreSendSettings): boolean {
    if (!settings.sendChunksBulk) return false;
    settings.sendChunksBulk = false;
    settings.sendChunksBulkMaxSize = 1;
    return true;
}
