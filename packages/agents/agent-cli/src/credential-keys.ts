// CLI credential-store helpers: persist API keys stripped from the plaintext config and restore them on read.
import * as path from 'path';
import { McpOAuthCredentialStore } from '@tsdi/agent-tools';

export function cliCredentialId(filePath: string): string {
    return `cli-config:${path.basename(filePath)}`;
}

export function cliCredentialStore(filePath: string): McpOAuthCredentialStore {
    return new McpOAuthCredentialStore(path.join(path.dirname(filePath), 'mcp-credentials.json'));
}

export function collectApiKeys(value: unknown, prefix = '', result: Record<string, string> = {}): Record<string, string> {
    if (Array.isArray(value)) {
        value.forEach((item, index) => collectApiKeys(item, `${prefix}/${index}`, result));
    } else if (value && typeof value === 'object') {
        Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
            const next = `${prefix}/${key}`;
            if (key === 'apiKey' && typeof entry === 'string' && entry.trim()) result[next] = entry;
            else collectApiKeys(entry, next, result);
        });
    }
    return result;
}

function readPointer(target: any, segments: string[]): any {
    let current = target;
    for (const segment of segments) {
        if (!current || typeof current !== 'object') {
            return undefined;
        }
        current = current[segment];
    }
    return current;
}

function writePointer(target: any, segments: string[], value: any): void {
    let current = target;
    for (let index = 0; index < segments.length - 1; index++) {
        if (!current?.[segments[index]] || typeof current[segments[index]] !== 'object') return;
        current = current[segments[index]];
    }
    if (current && segments.length) current[segments[segments.length - 1]] = value;
}

/**
 * Restores API keys that the CLI persisted to the encrypted credential store and
 * stripped from the plaintext config. A non-empty plaintext key is an explicit
 * user override (opencode gives config `options.apiKey` the same precedence over
 * stored auth), so it wins over the stored copy; the store is then reconciled so
 * a stale credential can never silently shadow an edited key.
 */
export function restoreStoredApiKeys(filePath: string, value: Record<string, any>): Record<string, any> {
    const store = cliCredentialStore(filePath);
    const stored = store.get(cliCredentialId(filePath))?.token.accessToken;
    if (!stored) return value;
    const keys = JSON.parse(stored) as Record<string, string>;
    const reconciled: Record<string, string> = {};
    let changed = false;
    Object.entries(keys).forEach(([pointer, secret]) => {
        const segments = pointer.split('/').filter(Boolean);
        if (!segments.length) return;
        const existing = readPointer(value, segments);
        if (typeof existing === 'string' && existing.trim()) {
            reconciled[pointer] = existing;
            if (existing !== secret) changed = true;
            return;
        }
        writePointer(value, segments, secret);
        reconciled[pointer] = secret;
    });
    if (changed) {
        try {
            store.set(cliCredentialId(filePath), { accessToken: JSON.stringify(reconciled), tokenType: 'Internal' });
        } catch {
            // A read must stay usable even when the credential store is not writable;
            // the explicit plaintext value already won above.
        }
    }
    return value;
}
