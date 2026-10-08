import * as fs from 'fs';
import * as path from 'path';

/**
 * Global instruction files (agent-root `AGENTS.md`) that apply to every
 * workspace. Injected ahead of the workspace instruction chain.
 */
export function resolveCliInstructionDocs(root?: string): string[] {
    if (!root) {
        return [];
    }
    return ['AGENTS.md']
        .map(name => path.join(path.resolve(root), name))
        .filter(file => {
            try {
                return fs.existsSync(file);
            } catch {
                return false;
            }
        });
}
