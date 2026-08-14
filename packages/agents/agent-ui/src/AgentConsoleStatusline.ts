import { FileAdapter } from '@tsdi/common';
import { Injectable, Optional } from '@tsdi/ioc';

export const AGENT_CONSOLE_STATUSLINE_FIELDS = [
    'model',
    'context',
    'git-branch',
    'tokens',
    'session',
    'workspace',
    'agent'
] as const;

export type AgentConsoleStatuslineField = typeof AGENT_CONSOLE_STATUSLINE_FIELDS[number];

export const defaultAgentConsoleStatusline: AgentConsoleStatuslineField[] = [...AGENT_CONSOLE_STATUSLINE_FIELDS];

export function isAgentConsoleStatuslineField(value: string): value is AgentConsoleStatuslineField {
    return (AGENT_CONSOLE_STATUSLINE_FIELDS as readonly string[]).includes(value);
}

export function normalizeAgentConsoleStatusline(fields?: string[] | null): AgentConsoleStatuslineField[] {
    if (!Array.isArray(fields)) {
        return [...defaultAgentConsoleStatusline];
    }
    const seen = new Set<string>();
    const normalized: AgentConsoleStatuslineField[] = [];
    for (const raw of fields) {
        const field = String(raw || '').trim().toLowerCase();
        if (!isAgentConsoleStatuslineField(field) || seen.has(field)) {
            continue;
        }
        seen.add(field);
        normalized.push(field);
    }
    return normalized;
}

@Injectable()
export class AgentConsoleStatuslineStore {
    constructor(@Optional() private fileAdapter?: FileAdapter | null) {}

    async load(workspace: string): Promise<AgentConsoleStatuslineField[] | undefined> {
        if (!workspace || !this.fileAdapter) return undefined;
        try {
            const parsed = JSON.parse(await this.fileAdapter.readText(this.path(workspace)));
            return normalizeAgentConsoleStatusline(parsed?.statusline);
        } catch {
            return undefined;
        }
    }

    async save(workspace: string, statusline: AgentConsoleStatuslineField[]): Promise<void> {
        if (!workspace || !this.fileAdapter) return;
        const directory = this.fileAdapter.join(workspace, '.tsdi-agent');
        await this.fileAdapter.mkdir(directory, { recursive: true });
        await this.fileAdapter.writeText(this.path(workspace), JSON.stringify({ version: 1, statusline }, null, 2));
    }

    private path(workspace: string): string {
        return this.fileAdapter!.join(workspace, '.tsdi-agent', 'statusline.json');
    }
}
