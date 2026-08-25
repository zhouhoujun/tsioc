import { AGENT_CONSOLE_APP_RPC, AgentConsoleAppRpc, MemoryStore, normalizeAgentWorkspaceIdentity } from '@tsdi/agent';
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
        const resolvedWorkspace = this.resolveWorkspaceKey(workspace);
        const rawWorkspace = String(workspace || '').trim() || 'default';
        if (this.appRpc) {
            const result = await this.appRpc.request('app.inputHistory.get', {
                workspace: resolvedWorkspace
            });
            return this.normalizeEntries(result);
        }
        if (!this.memory) {
            return [];
        }
        const records = (await this.memory.getAll(undefined))
            .filter(item => item.scope === 'global'
                && item.key === AgentConsoleInputHistoryStore.HISTORY_KEY
                && (item.metadata?.workspace === resolvedWorkspace || item.metadata?.workspace === rawWorkspace))
            .map((item, index) => ({ item, index }))
            .sort((left, right) => {
                const timeDelta = (right.item.updatedAt || right.item.createdAt || 0) - (left.item.updatedAt || left.item.createdAt || 0);
                return timeDelta !== 0 ? timeDelta : right.index - left.index;
            })
            .map(entry => entry.item);
        return this.mergeEntries(records.map(record => this.parseEntries(record.value)));
    }

    async save(entries: string[], workspace?: string, sessionId?: string): Promise<void> {
        const resolvedWorkspace = this.resolveWorkspaceKey(workspace);
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

    protected resolveWorkspaceKey(workspace?: string): string {
        return normalizeAgentWorkspaceIdentity(workspace) || 'default';
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
            : Array.isArray((value as { entries?: unknown })?.entries)
                ? (value as { entries: unknown[] }).entries
                : [];
        return Array.from(new Set(entries
            .map((entry: any) => String(entry || '').trim())
            .filter(Boolean)))
            .slice(0, 200);
    }

    protected mergeEntries(groups: string[][]): string[] {
        const merged: string[] = [];
        const seen = new Set<string>();
        for (const group of groups) {
            for (const entry of group) {
                if (!seen.has(entry)) {
                    seen.add(entry);
                    merged.push(entry);
                }
                if (merged.length >= 200) {
                    return merged;
                }
            }
        }
        return merged;
    }
}
