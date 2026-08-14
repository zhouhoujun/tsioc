import * as path from 'path';
import { AgentToolsOptions, ImportConfigResult, ImportConfigSource, ImportConfigTool } from '@tsdi/agent-tools';

export interface AgentImportCliOptions {
    workspace?: string;
    sources?: string;
    apply?: boolean;
    root?: string;
    home?: string;
    json?: boolean;
}

export interface AgentImportIo {
    stdout?: { write(chunk: string): any };
}

const IMPORT_SOURCE_VALUES: ImportConfigSource[] = ['claude-md', 'cursor-rules', 'cursor-mcp', 'claude-user', 'cursor-user', 'ecosystem'];

export function parseImportSources(input?: string): ImportConfigSource[] | undefined {
    if (!input) {
        return undefined;
    }
    const items = input.split(',').map(item => item.trim()).filter(Boolean);
    const invalid = items.filter(item => !(IMPORT_SOURCE_VALUES as string[]).includes(item));
    if (invalid.length) {
        throw new Error(`Unknown import source(s): ${invalid.join(', ')}. Expected: ${IMPORT_SOURCE_VALUES.join(', ')}.`);
    }
    return items as ImportConfigSource[];
}

export function formatImportResult(result: ImportConfigResult, workspace: string): string {
    const lines: string[] = [];
    lines.push(`Migration ${result.mode === 'apply' ? 'applied' : 'preview'} (workspace: ${workspace})`);
    for (const action of result.actions) {
        lines.push(`  [${action.status}] ${action.kind}`);
        lines.push(`    source: ${action.source}`);
        lines.push(`    target: ${action.target}`);
        if (action.detail) {
            lines.push(`    detail: ${action.detail}`);
        }
    }
    lines.push(`Summary: ${result.summary.detected} detected, ${result.summary.applied} applied, ${result.summary.skipped} skipped, ${result.summary.noChange} no-change`);
    if (result.mode === 'preview' && result.summary.detected > 0) {
        lines.push('Run with --apply to write the changes.');
    }
    return lines.join('\n');
}

export async function runAgentImport(options: AgentImportCliOptions, io: AgentImportIo = {}): Promise<ImportConfigResult> {
    const stdout = io.stdout || process.stdout;
    const workspace = path.resolve(options.workspace || process.cwd());
    const tool = new ImportConfigTool({ file: { rootDir: workspace } } as AgentToolsOptions);
    const sources = parseImportSources(options.sources);
    const result = await tool.invoke({
        workspace,
        mode: options.apply ? 'apply' : 'preview',
        ...(sources ? { sources } : {}),
        ...(options.root ? { agentRoot: options.root } : {}),
        ...(options.home ? { homeDir: options.home } : {})
    }, {} as any);
    stdout.write(options.json
        ? JSON.stringify(result, null, 2) + '\n'
        : formatImportResult(result, workspace) + '\n');
    return result;
}
