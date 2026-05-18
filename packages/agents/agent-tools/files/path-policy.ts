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
