import * as fs from 'fs';
import * as path from 'path';

/**
 * Persist the runtime model options (provider/model/baseUrl/credentials/
 * profiles/defaultProfile) as the `model` section of `<root>/settings.json`.
 * Unlike the tier-aware UI writer, this replaces the whole section so an
 * activation cannot leave the old top-level model in place.
 */
export function writeAgentModelConfig(root: string, model: Record<string, any>): string {
    const settingsPath = path.join(path.resolve(root), 'settings.json');
    let current: Record<string, any> = {};
    try {
        const parsed = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        current = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
        current = {};
    }
    const next = { ...current, model: { ...(model || {}) } };
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, JSON.stringify(next, null, 2));
    return settingsPath;
}
