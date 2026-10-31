import * as fs from 'fs';
import * as path from 'path';

interface WorkspaceSessionSettings {
    lastSessionId?: string;
    openSessionIds?: string[];
}

function readWorkspaceSettings(workspace?: string): WorkspaceSessionSettings {
    const dir = String(workspace || '').trim();
    if (!dir) return {};
    try {
        const parsed = JSON.parse(fs.readFileSync(path.join(path.resolve(dir), '.tsdi-agent', 'settings.json'), 'utf8'));
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return {};
        }
        return {
            lastSessionId: typeof parsed.lastSessionId === 'string' && parsed.lastSessionId.trim()
                ? parsed.lastSessionId.trim()
                : undefined,
            openSessionIds: Array.isArray(parsed.openSessionIds)
                ? parsed.openSessionIds.filter((id: unknown) => typeof id === 'string' && id.trim()).map((id: string) => id.trim())
                : undefined
        };
    } catch {
        // A missing/invalid workspace settings file means "no previous session".
        return {};
    }
}

/** Read the session recorded when this workspace's TUI last exited. */
export function resolveLastSessionId(workspace?: string): string | undefined {
    const settings = readWorkspaceSettings(workspace);
    if (settings.lastSessionId) {
        return settings.lastSessionId;
    }
    const open = settings.openSessionIds || [];
    return open.length ? open[open.length - 1] : undefined;
}

/**
 * Resolve the startup session. An explicit `--session <id>` always wins; a bare
 * `--session` or no flag restores the workspace's last active session (which
 * implies the tabs recorded at the previous exit). No record means a fresh
 * session.
 */
export function resolveSessionOption(session: unknown, workspace?: string): string | undefined {
    const explicit = typeof session === 'string' ? session.trim() : '';
    return explicit || resolveLastSessionId(workspace);
}
