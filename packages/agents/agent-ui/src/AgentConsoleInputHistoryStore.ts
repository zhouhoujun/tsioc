import { AGENT_CONSOLE_APP_RPC, AgentConsoleAppRpc, MemoryStore } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';

@Injectable()
export class AgentConsoleInputHistoryStore {
    protected static readonly HISTORY_KEY = 'agent-ui.console.input-history';

    constructor(
        @Optional() @Inject(AGENT_CONSOLE_APP_RPC) private appRpc?: AgentConsoleAppRpc | null,
        @Optional() private memory?: MemoryStore | null
    ) {
    }

    async load(workspace?: string, sessionId?: string): Promise<string[]> {
        const resolvedWorkspace = String(workspace || '').trim() || 'default';
        const resolvedSessionId = String(sessionId || '').trim();
        if (this.appRpc) {
            const result = await this.appRpc.request('app.inputHistory.get', {
                workspace: resolvedWorkspace,
                sessionId: resolvedSessionId || undefined
            });
            return this.normalizeEntries(result);
        }
        if (!this.memory) {
            return [];
        }
        const record = (await this.memory.getAll(resolvedSessionId || undefined))
            .filter(item => item.scope === 'global'
                && item.key === AgentConsoleInputHistoryStore.HISTORY_KEY
                && item.metadata?.workspace === resolvedWorkspace
                && String(item.metadata?.sessionId || '').trim() === resolvedSessionId)
            .sort((left, right) => (right.updatedAt || right.createdAt || 0) - (left.updatedAt || left.createdAt || 0))[0];
        if (!record) {
            return [];
        }
        return this.parseEntries(record.value);
    }

    async save(entries: string[], workspace?: string, sessionId?: string): Promise<void> {
        const resolvedWorkspace = String(workspace || '').trim() || 'default';
        const resolvedSessionId = String(sessionId || '').trim();
        const normalized = this.normalizeEntries(entries);
        if (this.appRpc) {
            await this.appRpc.request('app.inputHistory.put', {
                workspace: resolvedWorkspace,
                sessionId: resolvedSessionId || undefined,
                entries: normalized
            });
            return;
        }
        if (!this.memory) {
            return;
        }
        const id = this.createRecordId(resolvedWorkspace, resolvedSessionId);
        const records = await this.memory.getAll(resolvedSessionId || undefined);
        const existing = records.find(item => item.id === id && item.scope === 'global');
        await this.memory.delete(id, undefined, 'global');
        await this.memory.put({
            id,
            key: AgentConsoleInputHistoryStore.HISTORY_KEY,
            value: JSON.stringify(normalized),
            scope: 'global',
            namespace: 'agent-ui',
            category: 'workspace',
            metadata: {
                workspace: resolvedWorkspace,
                sessionId: resolvedSessionId,
                kind: 'console-input-history'
            },
            createdAt: existing?.createdAt || Date.now(),
            updatedAt: Date.now()
        });
    }

    protected createRecordId(workspace: string, sessionId?: string): string {
        return `agent-ui:console-input-history:${encodeURIComponent(workspace)}:${encodeURIComponent(String(sessionId || '').trim() || 'default')}`;
    }

    protected parseEntries(value: unknown): string[] {
        try {
            const parsed = typeof value === 'string' ? JSON.parse(value) : value;
            return this.normalizeEntries(parsed);
        } catch {
            return this.normalizeEntries(value);
        }
    }

    protected normalizeEntries(value: unknown): string[] {
        const entries: any[] = Array.isArray(value)
            ? value
            : Array.isArray((value as any)?.entries)
                ? (value as any).entries
                : [];
        return Array.from(new Set(entries
            .map((entry: any) => String(entry || '').trim())
            .filter(Boolean)))
            .slice(0, 200);
    }
}
