import * as path from 'path';
import { AgentToolsOptions, defaultAgentToolsOptions, mergeAgentToolsOptions } from '../src/options';

export interface ResolvedFilePolicy {
    rootDir: string;
    maxReadBytes: number;
    maxReadLines: number;
    maxReadLinesLimit: number;
    maxSearchResults: number;
    defaultGlob: string[];
    excludedGlobs: string[];
    requireReadBeforeWrite: boolean;
}

export function resolveFilePolicy(options?: AgentToolsOptions): ResolvedFilePolicy {
    const merged = mergeAgentToolsOptions(options);
    const file = merged.file ?? defaultAgentToolsOptions.file!;
    return {
        rootDir: path.resolve(file.rootDir ?? process.cwd()),
        maxReadBytes: file.maxReadBytes ?? 32 * 1024,
        maxReadLines: file.maxReadLines ?? 400,
        maxReadLinesLimit: file.maxReadLinesLimit ?? 2000,
        maxSearchResults: file.maxSearchResults ?? 50,
        defaultGlob: (file.defaultGlob ?? ['**/*']).slice(),
        excludedGlobs: (file.excludedGlobs ?? []).slice(),
        requireReadBeforeWrite: file.requireReadBeforeWrite === true
    };
}

export function resolveWorkspacePath(targetPath: string, rootDir: string): string {
    const normalized = targetPath.trim();
    if (!normalized) {
        throw new Error('A path is required.');
    }
    const absolute = path.resolve(rootDir, normalized);
    const relative = path.relative(rootDir, absolute);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new Error(`Path '${targetPath}' is outside the allowed workspace root. Use a workspace-relative path (root: ${rootDir}); do not use absolute paths or '..'.`);
    }
    return absolute;
}

export function toRelativeWorkspacePath(filePath: string, rootDir: string): string {
    return path.relative(rootDir, filePath).split(path.sep).join('/');
}

export function resolveWorkspaceSubdir(targetPath: unknown, rootDir: string): string {
    const value = String(targetPath ?? '').trim();
    if (!value || value === '.' || value === './') {
        return '';
    }
    const absolute = resolveWorkspacePath(value, rootDir);
    const relative = path.relative(rootDir, absolute).split(path.sep).join('/');
    return relative === '.' ? '' : relative;
}

export async function assertNoSymlinkInWorkspacePath(targetPath: string, rootDir: string, options?: { allowMissingPath?: boolean; }): Promise<void> {
    const absoluteRoot = path.resolve(rootDir);
    const relative = path.relative(absoluteRoot, targetPath);
    const segments = relative.split(path.sep).filter(Boolean);
    let current = absoluteRoot;
    for (let index = 0; index < segments.length; index++) {
        current = path.join(current, segments[index]);
        try {
            const stat = await import('fs').then(fs => fs.promises.lstat(current));
            if (stat.isSymbolicLink()) {
                throw new Error(`Path '${toRelativeWorkspacePath(current, absoluteRoot)}' resolves through a symbolic link, which is not allowed.`);
            }
        } catch (error: any) {
            if (error?.code === 'ENOENT') {
                if (options?.allowMissingPath) {
                    return;
                }
                // Report a missing path in actionable, tool-facing language
                // instead of leaking a raw `ENOENT: ... lstat ...` from the
                // filesystem. `code` is preserved so callers that branch on
                // ENOENT keep working.
                const missing: NodeJS.ErrnoException = new Error(
                    `Path '${toRelativeWorkspacePath(current, absoluteRoot)}' does not exist.`
                );
                missing.code = 'ENOENT';
                throw missing;
            }
            throw error;
        }
    }
}

export function truncateTextByLinesAndBytes(content: string, maxBytes: number, maxLines: number): { content: string; truncated: boolean; } {
    const lines = content.split(/\r?\n/);
    const sliced = lines.slice(0, Math.max(1, maxLines)).join('\n');
    const bytes = Buffer.byteLength(sliced, 'utf8');
    if (bytes <= maxBytes && lines.length <= maxLines) {
        return { content: sliced, truncated: false };
    }

    let output = sliced;
    while (Buffer.byteLength(output, 'utf8') > maxBytes && output.length > 0) {
        output = output.slice(0, -1);
    }
    return {
        content: output,
        truncated: true
    };
}
