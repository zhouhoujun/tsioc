import { basenameAgentPath, dirnameAgentPath } from '../AgentWorkspacePath';

/**
 * AGENTS.md discovery helpers.
 *
 * The agent loads project context from AGENTS.md files (walking upward from
 * the current working directory) so the model can orient itself inside the
 * user's project. The upward walk stops at the home directory and filesystem
 * root to avoid scanning unrelated trees.
 *
 * The discovery result is an ordered instruction chain: every directory on the
 * path from the project root down to the working directory contributes at most
 * one doc, ordered root → cwd. Nearer docs render after farther ones, so their
 * instructions take precedence (near overrides far). Within a single directory
 * `AGENTS.override.md` replaces `AGENTS.md` when both exist.
 */

export const DEFAULT_AGENTS_DOC_NAME = 'AGENTS.md';
export const DEFAULT_AGENTS_DOC_OVERRIDE_NAME = 'AGENTS.override.md';
export const DEFAULT_AGENTS_DOC_MAX_BYTES = 32768;
export const DEFAULT_AGENTS_DOC_FALLBACK_FILENAMES: string[] = ['AGENTS.md'];

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

export function isHomeDirectory(dir: string, homeDirectory?: string): boolean {
    const resolvedHome = normalizeDocPath(homeDirectory || '');
    return !!resolvedHome && normalizeDocPath(dir) === resolvedHome;
}

/** Walk upward from startDir, returning the first existing `<dir>/<fileName>`. */
export function findFileUpward(startDir: string, fileName: string, options?: FindFileUpwardOptions): string | undefined {
    const stopAtHome = options?.stopAtHome ?? true;
    const exists = options?.exists ?? (() => false);
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

export interface FindAgentsDocOptions extends FindFileUpwardOptions {
    /** Primary doc name checked per directory (default AGENTS.md). */
    fileName?: string;
    /** Override doc name replacing the primary when present (default AGENTS.override.md). */
    overrideFileName?: string;
    /** Extra filenames tried per directory after the primary when it is missing. */
    fallbackFilenames?: string[];
}

export interface AgentsDocEntry {
    file: string;
    /** Directory containing the doc. */
    dir: string;
    /** True when the entry came from the override file name. */
    override?: boolean;
    /** Raw content when the chain has been read. */
    content?: string;
    /** True when content was cut at the byte cap. */
    truncated?: boolean;
    /** UTF-8 byte length of the retained content. */
    bytes?: number;
}

export interface AgentsDocChain {
    /** Ordered root → cwd; each directory contributes at most one entry. */
    entries: AgentsDocEntry[];
}

/** Build the ordered instruction chain for a start directory, walking upward. */
export function findAgentsDoc(startDir: string, options?: FindAgentsDocOptions): AgentsDocChain {
    const fileName = options?.fileName ?? DEFAULT_AGENTS_DOC_NAME;
    const overrideFileName = options?.overrideFileName ?? DEFAULT_AGENTS_DOC_OVERRIDE_NAME;
    const fallbacks = options?.fallbackFilenames ?? [];
    const stopAtHome = options?.stopAtHome ?? true;
    const exists = options?.exists ?? (() => false);
    const stopAt = normalizeDocPath(options?.stopAt || '');
    const candidates = Array.from(new Set([overrideFileName, fileName, ...fallbacks].filter(Boolean)));
    const found: AgentsDocEntry[] = [];
    let current = normalizeDocPath(startDir);
    for (;;) {
        let matched: string | undefined;
        for (const candidate of candidates) {
            if (exists(joinDocPath(current, candidate))) {
                matched = candidate;
                break;
            }
        }
        if (matched) {
            found.push({
                file: joinDocPath(current, matched),
                dir: current,
                override: matched === overrideFileName
            });
        }
        if (stopAt && current === stopAt) {
            break;
        }
        if (stopAtHome && isHomeDirectory(current, options?.homeDirectory)) {
            break;
        }
        const parent = normalizeDocPath(dirnameAgentPath(current));
        if (parent === current) {
            break;
        }
        current = parent;
    }
    found.reverse();
    return { entries: found };
}

/** Read the raw contents of an AGENTS.md file; empty string when unreadable. */
export function readAgentsDoc(file: string, readText?: (path: string) => string): string {
    if (!readText) {
        return '';
    }
    try {
        return readText(file);
    } catch {
        return '';
    }
}

/** Cap a string to `maxBytes` UTF-8 bytes without splitting multi-byte characters. */
export function truncateDocContent(content: string, maxBytes: number): { content: string; truncated: boolean; bytes: number } {
    const input = String(content ?? '');
    if (maxBytes <= 0) {
        return { content: '', truncated: input.length > 0, bytes: 0 };
    }
    const encoder = new TextEncoder();
    const full = encoder.encode(input);
    if (full.byteLength <= maxBytes) {
        return { content: input, truncated: false, bytes: full.byteLength };
    }
    let sliced = new TextDecoder().decode(full.subarray(0, maxBytes));
    while (sliced.endsWith('\uFFFD') && sliced.length > 0) {
        sliced = sliced.slice(0, -1);
    }
    return { content: sliced, truncated: true, bytes: encoder.encode(sliced).byteLength };
}

/** Read and byte-cap every entry of a chain. */
export function readAgentsDocChain(chain: AgentsDocChain, options?: { maxBytes?: number; readText?: (path: string) => string }): AgentsDocChain {
    const maxBytes = options?.maxBytes ?? DEFAULT_AGENTS_DOC_MAX_BYTES;
    return {
        entries: chain.entries.map(entry => {
            const raw = readAgentsDoc(entry.file, options?.readText);
            const capped = truncateDocContent(raw, maxBytes);
            return { ...entry, content: capped.content, truncated: capped.truncated, bytes: capped.bytes };
        })
    };
}
