import { promises as fs } from 'fs';
import * as path from 'path';
import { AgentTool, AgentToolContext, FileSnapshot } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { AgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';
import { assertNoSymlinkInWorkspacePath, resolveFilePolicy, resolveWorkspacePath, toRelativeWorkspacePath } from './path-policy';
import { runFormatter } from './formatter';
import { collectLspDiagnostics } from '../lsp/lsp-feedback';

const BEGIN_MARKER = '*** Begin Patch';
const END_MARKER = '*** End Patch';
const EOF_MARKER = '*** End of File';
const HUNK_HEADER = /^\*\*\* (Add|Update|Delete) File: (.+)$/;
const MOVE_HEADER = /^\*\*\* Move to: (.+)$/;
const DEFAULT_MAX_PATCH_BYTES = 96 * 1024;

type HunkType = 'add' | 'update' | 'delete';

interface PatchHunk {
    type: HunkType;
    filePath: string;
    moveTo?: string;
    lines: string[];
}

interface PatchPlanFile {
    absolutePath: string;
    relativePath: string;
    before: string | null;
    after: string | null;
    change: 'added' | 'updated' | 'deleted' | 'moved' | 'unchanged';
}

interface PatchPlan {
    files: PatchPlanFile[];
    added: number;
    updated: number;
    deleted: number;
    moved: number;
}

function parsePatch(patchText: string): PatchHunk[] {
    const lines = patchText.split(/\r?\n/);
    const beginIndex = lines.findIndex(line => line.trim() === BEGIN_MARKER);
    if (beginIndex === -1) {
        throw new Error('Invalid apply_patch input: patch must contain a `*** Begin Patch` marker.');
    }
    const endIndex = lines.findIndex((line, index) => index > beginIndex && line.trim() === END_MARKER);
    if (endIndex === -1) {
        throw new Error('Invalid apply_patch input: patch must contain a `*** End Patch` marker.');
    }
    const hunks: PatchHunk[] = [];
    let current: PatchHunk | null = null;
    for (let index = beginIndex + 1; index < endIndex; index++) {
        const line = lines[index];
        const trimmed = line.trim();
        if (trimmed === EOF_MARKER) {
            current = null;
            continue;
        }
        const header = HUNK_HEADER.exec(trimmed);
        if (header) {
            current = {
                type: header[1].toLowerCase() as HunkType,
                filePath: header[2],
                lines: []
            };
            hunks.push(current);
            continue;
        }
        const move = MOVE_HEADER.exec(trimmed);
        if (move) {
            if (!current || current.type !== 'update') {
                throw new Error(`Invalid apply_patch input: '${trimmed}' must follow an '*** Update File' header.`);
            }
            current.moveTo = move[1];
            continue;
        }
        if (!current) {
            continue;
        }
        if (current.type === 'delete') {
            continue;
        }
        if (trimmed.startsWith('@@')) {
            continue;
        }
        if (current.type === 'add' && !line.startsWith('+')) {
            throw new Error(`Invalid apply_patch input: '*** Add File' content lines must start with '+'.`);
        }
        if (current.type === 'update' && line.length > 0 && line[0] !== '+' && line[0] !== '-' && line[0] !== ' ') {
            throw new Error(`Invalid apply_patch input: unexpected line '${line}' inside an '*** Update File' hunk.`);
        }
        current.lines.push(line);
    }
    if (hunks.length === 0) {
        throw new Error('Invalid apply_patch input: patch contains no file hunks.');
    }
    return hunks;
}

function readOrNull(filePath: string): Promise<string | null> {
    return fs.readFile(filePath, 'utf8').catch((error: any) => {
        if (error?.code === 'ENOENT') {
            return null;
        }
        throw error;
    });
}

interface ContextMatch {
    at: number;
    length: number;
}

function normalizeMatchLine(line: string): string {
    return line.replace(/\r$/, '').replace(/[ \t]+$/, '');
}

function lineStartOffsets(content: string): number[] {
    const starts = [0];
    for (let index = 0; index < content.length; index++) {
        if (content[index] === '\n') {
            starts.push(index + 1);
        }
    }
    return starts;
}

function findTolerantMatches(content: string, removalLines: string[]): ContextMatch[] {
    const contentLines = content.split('\n');
    const starts = lineStartOffsets(content);
    const results: ContextMatch[] = [];
    const span = removalLines.length;
    for (let index = 0; index + span <= contentLines.length; index++) {
        let matched = true;
        for (let offset = 0; offset < span; offset++) {
            if (normalizeMatchLine(contentLines[index + offset]) !== normalizeMatchLine(removalLines[offset])) {
                matched = false;
                break;
            }
        }
        if (!matched) {
            continue;
        }
        const lastLineIndex = index + span - 1;
        const at = starts[index];
        const end = starts[lastLineIndex] + contentLines[lastLineIndex].length;
        results.push({ at, length: end - at });
    }
    return results;
}

function resolveUniqueContextMatch(content: string, removalText: string, relativePath: string): ContextMatch {
    const matches: number[] = [];
    let index = content.indexOf(removalText);
    while (index !== -1) {
        if (index === 0 || content[index - 1] === '\n') {
            matches.push(index);
        }
        index = content.indexOf(removalText, index + 1);
    }
    if (matches.length === 1) {
        return { at: matches[0], length: removalText.length };
    }
    if (matches.length > 1) {
        throw new Error(`Invalid apply_patch input: hunk for '${relativePath}' matches ${matches.length} locations; add more context lines to make it unique.`);
    }
    const tolerant = findTolerantMatches(content, removalText.split('\n'));
    if (tolerant.length === 1) {
        return tolerant[0];
    }
    if (tolerant.length > 1) {
        throw new Error(`Invalid apply_patch input: hunk for '${relativePath}' matches ${tolerant.length} locations after whitespace normalization; add more context lines to make it unique.`);
    }
    throw new Error(`Invalid apply_patch input: hunk for '${relativePath}' does not match the file content (whitespace-normalized matching was also attempted). Re-read the file and regenerate the hunk from its current content.`);
}

function applyUpdateHunk(content: string, hunk: PatchHunk): string {
    const removalLines: string[] = [];
    const replacementLines: string[] = [];
    for (const line of hunk.lines) {
        if (line.startsWith('+')) {
            replacementLines.push(line.slice(1));
        } else if (line.startsWith('-')) {
            removalLines.push(line.slice(1));
        } else {
            const contextLine = line.length > 0 ? line.slice(1) : '';
            removalLines.push(contextLine);
            replacementLines.push(contextLine);
        }
    }
    if (removalLines.length === 0) {
        throw new Error(`Invalid apply_patch input: update hunk for '${hunk.filePath}' must include at least one context or removed line to anchor the change.`);
    }
    const removalText = removalLines.join('\n');
    const match = resolveUniqueContextMatch(content, removalText, hunk.filePath);
    return content.slice(0, match.at) + replacementLines.join('\n') + content.slice(match.at + match.length);
}

function addedContent(hunk: PatchHunk): string {
    return hunk.lines.map(line => line.slice(1)).join('\n');
}

async function buildPlan(hunks: PatchHunk[], rootDir: string): Promise<PatchPlan> {
    const files = new Map<string, PatchPlanFile>();
    const virtual = new Map<string, string | null>();
    const movedTargets = new Set<string>();

    const currentContent = async (absolutePath: string, relativePath: string): Promise<string> => {
        if (virtual.has(absolutePath)) {
            const content = virtual.get(absolutePath)!;
            if (content === null) {
                throw new Error(`Invalid apply_patch input: file '${relativePath}' does not exist.`);
            }
            return content;
        }
        const content = await readOrNull(absolutePath);
        if (content === null) {
            throw new Error(`Invalid apply_patch input: file '${relativePath}' does not exist.`);
        }
        return content;
    };

    const registerFile = (absolutePath: string, relativePath: string, before: string | null): void => {
        if (!files.has(absolutePath)) {
            files.set(absolutePath, { absolutePath, relativePath, before, after: null, change: 'unchanged' });
        }
    };

    for (const hunk of hunks) {
        const absolutePath = resolveWorkspacePath(hunk.filePath, rootDir);
        const relativePath = toRelativeWorkspacePath(absolutePath, rootDir);
        await assertNoSymlinkInWorkspacePath(absolutePath, rootDir, { allowMissingPath: true });
        switch (hunk.type) {
            case 'add': {
                if (virtual.has(absolutePath)) {
                    throw new Error(`Invalid apply_patch input: file '${relativePath}' is referenced more than once.`);
                }
                const existing = await readOrNull(absolutePath);
                if (existing !== null) {
                    throw new Error(`Invalid apply_patch input: file '${relativePath}' already exists; use '*** Update File' instead of '*** Add File'.`);
                }
                const content = addedContent(hunk);
                registerFile(absolutePath, relativePath, null);
                virtual.set(absolutePath, content);
                break;
            }
            case 'delete': {
                const content = await currentContent(absolutePath, relativePath);
                registerFile(absolutePath, relativePath, content);
                virtual.set(absolutePath, null);
                break;
            }
            case 'update': {
                const content = await currentContent(absolutePath, relativePath);
                registerFile(absolutePath, relativePath, content);
                const updated = applyUpdateHunk(content, hunk);
                if (hunk.moveTo) {
                    const moveAbsolute = resolveWorkspacePath(hunk.moveTo, rootDir);
                    const moveRelative = toRelativeWorkspacePath(moveAbsolute, rootDir);
                    if (virtual.has(moveAbsolute)) {
                        throw new Error(`Invalid apply_patch input: move target '${moveRelative}' is referenced more than once.`);
                    }
                    await assertNoSymlinkInWorkspacePath(moveAbsolute, rootDir, { allowMissingPath: true });
                    const existing = await readOrNull(moveAbsolute);
                    registerFile(moveAbsolute, moveRelative, existing);
                    movedTargets.add(moveAbsolute);
                    virtual.set(moveAbsolute, updated);
                    virtual.set(absolutePath, null);
                } else {
                    virtual.set(absolutePath, updated);
                }
                break;
            }
        }
    }

    const planFiles: PatchPlanFile[] = [];
    for (const file of files.values()) {
        const after = virtual.get(file.absolutePath) ?? null;
        const resolved: PatchPlanFile = { ...file, after };
        if (movedTargets.has(file.absolutePath) && after !== null) {
            resolved.change = 'moved';
        } else if (resolved.after === null) {
            resolved.change = 'deleted';
        } else if (resolved.before === null) {
            resolved.change = 'added';
        } else if (resolved.before !== resolved.after) {
            resolved.change = 'updated';
        }
        planFiles.push(resolved);
    }

    return {
        files: planFiles,
        added: hunks.filter(hunk => hunk.type === 'add').length,
        updated: hunks.filter(hunk => hunk.type === 'update' && !hunk.moveTo).length,
        deleted: hunks.filter(hunk => hunk.type === 'delete').length,
        moved: hunks.filter(hunk => hunk.type === 'update' && !!hunk.moveTo).length
    };
}

async function commitPlan(plan: PatchPlan): Promise<void> {
    for (const file of plan.files) {
        if (file.after === null) {
            await fs.rm(file.absolutePath, { force: true });
            continue;
        }
        if (file.before === file.after) {
            continue;
        }
        await fs.mkdir(path.dirname(file.absolutePath), { recursive: true });
        await fs.writeFile(file.absolutePath, file.after, 'utf8');
    }
}

@Injectable()
export class ApplyPatchTool implements AgentTool {
    name = 'apply_patch';
    description = 'Apply a multi-file minidiff patch to the workspace. A patch opens with `*** Begin Patch` and closes with `*** End Patch`; hunks are declared with `*** Add File: <path>`, `*** Update File: <path>` (optionally followed by `*** Move to: <path>`), or `*** Delete File: <path>`. Update hunk lines are prefixed with `-` (removed), `+` (added), or a single space (context) and must match the file uniquely.';
    inputSchema = {
        type: 'object',
        properties: {
            patch: { type: 'string', description: 'The minidiff patch text to apply.' }
        },
        required: ['patch']
    };
    toolset = 'filesystem';
    source = 'local';
    execution = {
        readOnly: false,
        sideEffect: true,
        requiresSequential: true,
        authorization: { requiredPrincipals: ['local-system'], allowLocalAnonymous: true }
    };

    constructor(
        @Optional() @Inject(AGENT_TOOLS_OPTIONS, { defaultValue: null })
        private options?: AgentToolsOptions
    ) {
    }

    async captureFileSnapshot(input: any, _context?: AgentToolContext): Promise<FileSnapshot | null> {
        try {
            const patch = this.requirePatch(input?.patch);
            const policy = resolveFilePolicy(this.options);
            const plan = await buildPlan(parsePatch(patch), policy.rootDir);
            const primary = plan.files[0];
            return {
                filePath: primary.absolutePath,
                before: primary.before,
                after: null,
                timestamp: 0,
                files: plan.files.map(file => ({ filePath: file.absolutePath, before: file.before }))
            };
        } catch {
            return null;
        }
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const patch = this.requirePatch(input?.patch);
        const policy = resolveFilePolicy(this.options);
        const hunks = parsePatch(patch);
        const plan = await buildPlan(hunks, policy.rootDir);
        await commitPlan(plan);

        const formatResults = [];
        const lspFeedback: { path: string; diagnostics: import('../lsp/lsp-feedback').LspDiagnosticSummary[] }[] = [];
        for (const file of plan.files) {
            if (file.after === null) {
                continue;
            }
            const format = await runFormatter(file.absolutePath, this.options?.format);
            if (format.attempted) {
                formatResults.push({
                    path: file.relativePath,
                    formatted: format.formatted ?? null,
                    failure: format.failure
                });
            }
            const diagnostics = await collectLspDiagnostics(this.options, file.absolutePath);
            if (diagnostics && diagnostics.length > 0) {
                lspFeedback.push({ path: file.relativePath, diagnostics });
            }
        }

        return {
            ok: true,
            summary: `${plan.added} file(s) added, ${plan.updated} updated, ${plan.deleted} deleted, ${plan.moved} moved`,
            files: plan.files.map(file => ({
                path: file.relativePath,
                change: file.change
            })),
            bytesWritten: plan.files.reduce((sum, file) => sum + (file.after?.length ?? 0), 0),
            formatted: formatResults.length ? formatResults : undefined,
            lspDiagnostics: lspFeedback.length ? lspFeedback : undefined
        };
    }

    private requirePatch(value: unknown): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error('Invalid apply_patch input: patch must be a non-empty string.');
        }
        const limit = this.options?.file?.maxPatchBytes ?? DEFAULT_MAX_PATCH_BYTES;
        const bytes = Buffer.byteLength(value, 'utf8');
        if (bytes > limit) {
            throw new Error(
                `apply_patch input is ${bytes} bytes, exceeding the ${limit} byte limit. ` +
                `Split the patch into smaller per-file patches and apply them incrementally, ` +
                `or raise the limit via agentTools.file.maxPatchBytes.`
            );
        }
        return value;
    }
}
