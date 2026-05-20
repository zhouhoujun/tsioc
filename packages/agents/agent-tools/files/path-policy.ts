import * as path from 'path';
import { AgentToolsOptions, defaultAgentToolsOptions, mergeAgentToolsOptions } from '../src/options';

export interface ResolvedFilePolicy {
    rootDir: string;
    maxReadBytes: number;
    maxReadLines: number;
    maxSearchResults: number;
    defaultGlob: string[];
    excludedGlobs: string[];
}

export function resolveFilePolicy(options?: AgentToolsOptions): ResolvedFilePolicy {
    const merged = mergeAgentToolsOptions(options);
    const file = merged.file ?? defaultAgentToolsOptions.file!;
    return {
        rootDir: path.resolve(file.rootDir ?? process.cwd()),
        maxReadBytes: file.maxReadBytes ?? 32 * 1024,
        maxReadLines: file.maxReadLines ?? 400,
        maxSearchResults: file.maxSearchResults ?? 50,
        defaultGlob: (file.defaultGlob ?? ['**/*']).slice(),
        excludedGlobs: (file.excludedGlobs ?? []).slice()
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
        throw new Error(`Path '${targetPath}' is outside the allowed workspace root.`);
    }
    return absolute;
}

export function toRelativeWorkspacePath(filePath: string, rootDir: string): string {
    return path.relative(rootDir, filePath).split(path.sep).join('/');
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
            if (error?.code === 'ENOENT' && options?.allowMissingPath) {
                return;
            }
            if (error?.code === 'ENOENT') {
                throw error;
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
