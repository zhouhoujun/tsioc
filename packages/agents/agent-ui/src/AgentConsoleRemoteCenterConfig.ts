/**
 * Remote agent-center entries stored in the workspace `settings.json`.
 *
 * Kept in its own tiny module so the settings store can sanitize the list
 * without pulling the command/RPC layer (i18n, HTTP client) into startup.
 */
export interface AgentConsoleRemoteCenter {
    name: string;
    /** Gateway base URL (`http(s)://host:port`). */
    url: string;
    /** Bearer token minted by `tsdi-agent serve`; never rendered in the UI. */
    token?: string;
    /** Explicit opt-in: allow `/remotes spawn` to create workers on this gateway. */
    allowSpawn?: boolean;
}

/** Hard cap keeps a stale settings file from turning the picker into a probe storm. */
const MAX_REMOTE_CENTERS = 10;

export function sanitizeAgentConsoleRemoteCenters(value: unknown): AgentConsoleRemoteCenter[] {
    if (!Array.isArray(value)) {
        return [];
    }
    const centers: AgentConsoleRemoteCenter[] = [];
    const names = new Set<string>();
    for (const item of value) {
        if (!item || typeof item !== 'object') {
            continue;
        }
        const name = String((item as any).name || '').trim().slice(0, 40);
        const url = String((item as any).url || '').trim().replace(/\/+$/, '');
        if (!name || names.has(name.toLowerCase()) || !/^https?:\/\/[^\s]+$/i.test(url)) {
            continue;
        }
        names.add(name.toLowerCase());
        const token = typeof (item as any).token === 'string' && (item as any).token.trim()
            ? (item as any).token.trim()
            : undefined;
        const allowSpawn = (item as any).allowSpawn === true ? true : undefined;
        centers.push({ name, url, ...(token ? { token } : {}), ...(allowSpawn ? { allowSpawn } : {}) });
        if (centers.length >= MAX_REMOTE_CENTERS) {
            break;
        }
    }
    return centers;
}

/** Strip embedded credentials before a URL is shown in a dialog/notice. */
export function maskAgentConsoleRemoteUrl(value: string): string {
    const raw = String(value || '').trim();
    try {
        const url = new URL(raw);
        if (url.username || url.password) {
            url.username = '***';
            url.password = '***';
        }
        return url.toString().replace(/\/+$/, '');
    } catch {
        return raw;
    }
}
