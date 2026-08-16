import { FileAdapter } from '@tsdi/common';
import { Injectable, Optional } from '@tsdi/ioc';

export const AGENT_CONSOLE_TITLE_FIELDS = [
    'project',
    'status',
    'thread',
    'branch',
    'model',
    'context',
    'task'
] as const;

export type AgentConsoleTitleField = typeof AGENT_CONSOLE_TITLE_FIELDS[number];

export const defaultAgentConsoleTitle: AgentConsoleTitleField[] = [...AGENT_CONSOLE_TITLE_FIELDS];

export function isAgentConsoleTitleField(value: string): value is AgentConsoleTitleField {
    return (AGENT_CONSOLE_TITLE_FIELDS as readonly string[]).includes(value);
}

export function normalizeAgentConsoleTitle(fields?: string[] | null): AgentConsoleTitleField[] {
    if (!Array.isArray(fields)) {
        return [...defaultAgentConsoleTitle];
    }
    const seen = new Set<string>();
    const normalized: AgentConsoleTitleField[] = [];
    for (const raw of fields) {
        const field = String(raw || '').trim().toLowerCase();
        if (!isAgentConsoleTitleField(field) || seen.has(field)) {
            continue;
        }
        seen.add(field);
        normalized.push(field);
    }
    return normalized;
}

export interface AgentConsoleTerminalTitleInput {
    projectKey?: string;
    projectLabel?: string;
    workspace?: string;
    status?: string;
    pendingApprovalCount?: number;
    sessionId?: string;
    gitBranch?: string;
    model?: string;
    title?: string;
}

function basename(value: string): string {
    return value.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || value;
}

function statusLabel(status: string): string {
    if (status === 'running') {
        return 'working';
    }
    if (status === 'reasoning') {
        return 'reasoning';
    }
    if (status === 'error') {
        return 'error';
    }
    return 'idle';
}

export function composeAgentConsoleTerminalTitle(
    input: AgentConsoleTerminalTitleInput,
    fields?: string[] | null
): string {
    const enabled = normalizeAgentConsoleTitle(fields);
    if (!enabled.length) {
        return '';
    }
    const project = input.projectLabel || input.projectKey || basename(String(input.workspace || ''));
    const status = (input.pendingApprovalCount || 0) > 0
        ? 'action_required'
        : statusLabel(String(input.status || ''));
    const parts: Record<AgentConsoleTitleField, string> = {
        project,
        status,
        thread: String(input.sessionId || '').trim(),
        branch: String(input.gitBranch || '').trim(),
        model: String(input.model || '').trim(),
        context: String(input.workspace || '').trim(),
        task: String(input.title || '').trim()
    };
    return enabled.map(field => parts[field]).filter(Boolean).join(' · ');
}

@Injectable()
export class AgentConsoleTitleStore {
    constructor(@Optional() private fileAdapter?: FileAdapter | null) {}

    async load(workspace: string): Promise<AgentConsoleTitleField[] | undefined> {
        if (!workspace || !this.fileAdapter) return undefined;
        try {
            const parsed = JSON.parse(await this.fileAdapter.readText(this.path(workspace)));
            return normalizeAgentConsoleTitle(parsed?.title);
        } catch {
            return undefined;
        }
    }

    async save(workspace: string, title: AgentConsoleTitleField[]): Promise<void> {
        if (!workspace || !this.fileAdapter) return;
        const directory = this.fileAdapter.join(workspace, '.tsdi-agent');
        await this.fileAdapter.mkdir(directory, { recursive: true });
        await this.fileAdapter.writeText(this.path(workspace), JSON.stringify({ version: 1, title }, null, 2));
    }

    private path(workspace: string): string {
        return this.fileAdapter!.join(workspace, '.tsdi-agent', 'title.json');
    }
}
