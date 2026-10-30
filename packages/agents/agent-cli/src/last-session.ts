import * as fs from 'fs';
import * as path from 'path';

/** Read the session id recorded when this workspace's TUI last exited. */
export function resolveLastSessionId(workspace?: string): string | undefined {
    const dir = String(workspace || '').trim();
    if (!dir) return undefined;
    try {
        const parsed = JSON.parse(fs.readFileSync(path.join(path.resolve(dir), '.tsdi-agent', 'settings.json'), 'utf8'));
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            && typeof parsed.lastSessionId === 'string' && parsed.lastSessionId.trim()) {
            return parsed.lastSessionId.trim();
        }
    } catch {
        // A missing/invalid workspace settings file means "no last session".
    }
    return undefined;
}
