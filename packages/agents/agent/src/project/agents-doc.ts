import { existsSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { homedir } from 'os';

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
}

export function isHomeDirectory(dir: string): boolean {
    return resolve(dir) === resolve(homedir());
}

/** Walk upward from startDir, returning the first existing `<dir>/<fileName>`. */
export function findFileUpward(startDir: string, fileName: string, options?: FindFileUpwardOptions): string | undefined {
    const stopAtHome = options?.stopAtHome ?? true;
    let current = resolve(startDir);
    for (;;) {
        const candidate = join(current, fileName);
        if (existsSync(candidate)) {
            return candidate;
        }
        if (stopAtHome && isHomeDirectory(current)) {
            return undefined;
        }
        const parent = dirname(current);
        if (parent === current) {
            return undefined;
        }
        current = parent;
    }
}

/** Locate the nearest project root by walking upward for a `.git` marker. */
export function findProjectRoot(startDir: string): string | undefined {
    const marker = findFileUpward(startDir, '.git');
    return marker ? dirname(marker) : undefined;
}

/** Locate an AGENTS.md for the given start directory, searching upward. */
export function findAgentsDoc(startDir: string, fileName: string = DEFAULT_AGENTS_DOC_NAME): string | undefined {
    return findFileUpward(startDir, fileName);
}

/** Read the raw contents of an AGENTS.md file; empty string when unreadable. */
export function readAgentsDoc(file: string): string {
    try {
        return readFileSync(file, 'utf8');
    } catch {
        return '';
    }
}
