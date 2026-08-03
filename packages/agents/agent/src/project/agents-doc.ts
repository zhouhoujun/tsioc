import { basenameAgentPath, dirnameAgentPath } from '../AgentWorkspacePath';

/**
 * AGENTS.md discovery helpers.
 *
 * The agent loads project context from an AGENTS.md file (walking upward from
 * the current working directory) so the model can orient itself inside the
 * user's project. The upward walk stops at the home directory and filesystem
 * root to avoid scanning unrelated trees.
 */

export const DEFAULT_AGENTS_DOC_NAME = 'AGENTS.md';

export interface FindFileUpwardOptions {
    /** Stop the upward walk once the home directory is reached (default true). */
    stopAtHome?: boolean;
    homeDirectory?: string;
    stopAt?: string;
    exists?: (path: string) => boolean;
}

function normalizeDocPath(input: string): string {
    let value = String(input || '').trim().replace(/\\/g, '/');
    if (!value) {
        return '';
    }
    const hadUncPrefix = value.startsWith('//');
    value = value.replace(/\/+/g, '/');
    if (hadUncPrefix) {
        value = `//${value.replace(/^\/+/, '')}`;
    }
    if (value !== '/' && !/^[a-zA-Z]:\/$/i.test(value)) {
        value = value.replace(/\/+$/, '');
    }
    return value;
}

function joinDocPath(base: string, fileName: string): string {
    const normalizedBase = normalizeDocPath(base);
    const normalizedFile = String(fileName || '').replace(/^[\\/]+/, '');
    if (!normalizedBase) {
        return normalizedFile;
    }
    if (!normalizedFile) {
        return normalizedBase;
    }
    if (normalizedBase.endsWith('/')) {
        return `${normalizedBase}${normalizedFile}`;
    }
    return `${normalizedBase}/${normalizedFile}`;
}

function loadNodeDocFs(): { existsSync(path: string): boolean; readFileSync(path: string, encoding: string): string; homedir(): string; } | null {
    try {
        const req = typeof require === 'function' ? require : null;
        if (!req) {
            return null;
        }
        const fs = req('fs');
        const os = req('os');
        return {
            existsSync: fs.existsSync.bind(fs),
            readFileSync: fs.readFileSync.bind(fs),
            homedir: os.homedir.bind(os)
        };
    } catch {
        return null;
    }
}

export function isHomeDirectory(dir: string, homeDirectory?: string): boolean {
    const node = loadNodeDocFs();
    const resolvedHome = normalizeDocPath(homeDirectory || node?.homedir?.() || '');
    return !!resolvedHome && normalizeDocPath(dir) === resolvedHome;
}

/** Walk upward from startDir, returning the first existing `<dir>/<fileName>`. */
export function findFileUpward(startDir: string, fileName: string, options?: FindFileUpwardOptions): string | undefined {
    const stopAtHome = options?.stopAtHome ?? true;
    const node = loadNodeDocFs();
    const exists = options?.exists ?? node?.existsSync ?? (() => false);
    const stopAt = normalizeDocPath(options?.stopAt || '');
    let current = normalizeDocPath(startDir);
    for (;;) {
        const candidate = joinDocPath(current, fileName);
        if (exists(candidate)) {
            return candidate;
        }
        if (stopAt && current === stopAt) {
            return undefined;
        }
        if (stopAtHome && isHomeDirectory(current, options?.homeDirectory)) {
            return undefined;
        }
        const parent = normalizeDocPath(dirnameAgentPath(current));
        if (parent === current) {
            return undefined;
        }
        current = parent;
    }
}

/** Locate the nearest project root by walking upward for a `.git` marker. */
export function findProjectRoot(startDir: string, options?: FindFileUpwardOptions): string | undefined {
    const marker = findFileUpward(startDir, '.git', options);
    return marker && basenameAgentPath(marker) === '.git' ? normalizeDocPath(dirnameAgentPath(marker)) : undefined;
}

/** Locate an AGENTS.md for the given start directory, searching upward. */
export function findAgentsDoc(startDir: string, fileName: string = DEFAULT_AGENTS_DOC_NAME, options?: FindFileUpwardOptions): string | undefined {
    return findFileUpward(startDir, fileName, options);
}

/** Read the raw contents of an AGENTS.md file; empty string when unreadable. */
export function readAgentsDoc(file: string, readText?: (path: string) => string): string {
    try {
        if (readText) {
            return readText(file);
        }
        const node = loadNodeDocFs();
        return node ? node.readFileSync(file, 'utf8') : '';
    } catch {
        return '';
    }
}
