import { DEFAULT_SETTINGS, type ObsidianLiveSyncSettings } from "@vrtmrz/livesync-commonlib/settings";
import { compatGlobal } from "@vrtmrz/livesync-commonlib/compat/common/coreEnvFunctions";
import { manifestVersion, packageVersion } from "@vrtmrz/livesync-commonlib/compat/common/coreEnvVars";
import type { LiveSyncBaseCore } from "@/LiveSyncBaseCore";
export function generateReport(settings: ObsidianLiveSyncSettings, core: LiveSyncBaseCore) {
    const responseConfig: Record<string, unknown> = { remote: "Cloudflare R2 (object storage)" };
    const REDACTED = "𝑅𝐸𝐷𝐴𝐶𝑇𝐸𝐷";
    const defaultKeys = Object.keys(DEFAULT_SETTINGS) as (keyof ObsidianLiveSyncSettings)[];
    const pluginConfig = JSON.parse(JSON.stringify(settings)) as ObsidianLiveSyncSettings;
    const pluginKeys = Object.keys(pluginConfig);
    for (const key of pluginKeys) {
        if (defaultKeys.includes(key as keyof ObsidianLiveSyncSettings)) continue;
        delete pluginConfig[key as keyof ObsidianLiveSyncSettings];
    }

    // CouchDB, peer-to-peer, and JWT settings do not apply to Red Sync; omit them entirely.
    for (const key of Object.keys(pluginConfig)) {
        if (
            /^(couchDB_|P2P_|jwt|useJWT$|encryptedCouchDBConnection$|useRequestAPI$|useCouchDBCacheControlHeadersOnly$)/.test(
                key
            )
        ) {
            delete (pluginConfig as unknown as Record<string, unknown>)[key];
        }
    }
    pluginConfig.passphrase = REDACTED;
    pluginConfig.encryptedPassphrase = REDACTED;
    pluginConfig.idDerivationKey = REDACTED;
    pluginConfig.encryptedIdDerivationKey = REDACTED;
    pluginConfig.accessKey = REDACTED;
    pluginConfig.secretKey = REDACTED;
    const redact = (source: string) => `${REDACTED}(${source.length} letters)`;
    const toSchemeOnly = (uri: string) => {
        try {
            return `${new URL(uri).protocol}//`;
        } catch {
            const matched = uri.match(/^[A-Za-z][A-Za-z0-9+.-]*:\/\//);
            return matched?.[0] ?? REDACTED;
        }
    };
    pluginConfig.remoteConfigurations = Object.fromEntries(
        Object.entries(pluginConfig.remoteConfigurations || {}).map(([id, config]) => [
            id,
            {
                ...config,
                uri: toSchemeOnly(config.uri),
            },
        ])
    );
    pluginConfig.region = redact(pluginConfig.region);
    pluginConfig.bucket = redact(pluginConfig.bucket);
    pluginConfig.pluginSyncExtendedSetting = {};
    pluginConfig.bucketCustomHeaders = redact(pluginConfig.bucketCustomHeaders);
    const endpoint = pluginConfig.endpoint;
    if (endpoint == "") {
        pluginConfig.endpoint = "Not configured or AWS";
    } else {
        const endpointScheme = pluginConfig.endpoint.startsWith("http:")
            ? "(HTTP)"
            : pluginConfig.endpoint.startsWith("https:")
              ? "(HTTPS)"
              : "";
        pluginConfig.endpoint = `${endpoint.indexOf(".r2.cloudflarestorage.") !== -1 ? "R2" : "self-hosted?"}(${endpointScheme})`;
    }
    const obsidianInfo = {
        navigator: compatGlobal.navigator.userAgent,
        fileSystem: core.services.vault.isStorageInsensitive() ? "insensitive" : "sensitive",
    };
    const result = {
        obsidianInfo,
        responseConfig,
        pluginConfig,
        manifestVersion,
        packageVersion,
    };
    return result;
}
