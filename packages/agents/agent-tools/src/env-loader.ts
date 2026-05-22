import * as fs from 'fs';
import * as path from 'path';

export interface EnvLoadOptions {
    /** Whether to override existing env vars (default: false) */
    override?: boolean;
    /** Whether to log loaded keys to stderr (default: false) */
    verbose?: boolean;
}

/**
 * Load .env files from the given directories, lowest priority first.
 * Order: global (~/.tsdi-agent/.env) → workspace (.env) → local (.env.local)
 */
export function loadEnvFiles(workspaceDir?: string, rootDir?: string, options: EnvLoadOptions = {}): string[] {
    const loaded: string[] = [];
    const { override = false, verbose = false } = options;

    const candidates: string[] = [];

    // Global agent config .env
    if (rootDir) {
        candidates.push(path.join(rootDir, '.env'));
    } else {
        const home = process.env.HOME || process.env.USERPROFILE || '/tmp';
        candidates.push(path.join(home, '.tsdi-agent', '.env'));
    }

    // Workspace .env
    if (workspaceDir) {
        candidates.push(path.join(workspaceDir, '.env'));
        candidates.push(path.join(workspaceDir, '.env.local'));
    }

    // Current directory .env
    candidates.push(path.join(process.cwd(), '.env'));
    candidates.push(path.join(process.cwd(), '.env.local'));

    for (const filePath of candidates) {
        const keys = loadEnvFile(filePath, override);
        if (keys.length && verbose) {
            process.stderr.write(`[env-loader] Loaded ${keys.length} keys from ${filePath}: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}\n`);
        }
        loaded.push(...keys);
    }

    return loaded;
}

export function loadEnvFile(filePath: string, override = false): string[] {
    const loaded: string[] = [];
    try {
        if (!fs.existsSync(filePath)) return loaded;
        const content = fs.readFileSync(filePath, 'utf8');
        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            // Skip comments and empty lines
            if (!trimmed || trimmed.startsWith('#')) continue;

            const eqIdx = trimmed.indexOf('=');
            if (eqIdx === -1) continue;

            const key = trimmed.slice(0, eqIdx).trim();
            // Unquoted or single/double quoted value
            let value = trimmed.slice(eqIdx + 1).trim();
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            // Strip inline comments (handle # inside quotes roughly)
            const hashIdx = value.indexOf(' #');
            if (hashIdx > 0 && !value.includes('"') && !value.includes("'")) {
                value = value.slice(0, hashIdx).trim();
            }

            if (!key || (!override && process.env[key] !== undefined)) continue;
            process.env[key] = value;
            loaded.push(key);
        }
    } catch {
        // Silently skip unreadable files
    }
    return loaded;
}
