import { MemoryStore } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';

export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface TodoItem {
    id: string;
    content: string;
    status: TodoStatus;
}

export interface TodoSummary {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    cancelled: number;
}

const VALID_STATUSES: TodoStatus[] = ['pending', 'in_progress', 'completed', 'cancelled'];

function normalizeStatus(status: unknown): TodoStatus {
    const value = typeof status === 'string' ? status.trim().toLowerCase() : '';
    return (VALID_STATUSES as string[]).includes(value) ? value as TodoStatus : 'pending';
}

function normalizeItem(input: any): TodoItem {
    const id = String(input?.id ?? '?').trim() || '?';
    const content = String(input?.content ?? '(no description)').trim() || '(no description)';
    return {
        id,
        content,
        status: normalizeStatus(input?.status)
    };
}

@Injectable()
export class TodoStore {
    protected static readonly TODO_MEMORY_ID_PREFIX = 'agent-todo';
    protected static readonly TODO_MEMORY_KEY = 'agent.todo.plan';
    private sessions = new Map<string, TodoItem[]>();

    constructor(@Optional() @Inject(MemoryStore) private memoryStore?: MemoryStore | null) {
    }

    async read(sessionId: string): Promise<TodoItem[]> {
        if (!this.memoryStore) {
            return (this.sessions.get(sessionId) ?? []).map(item => ({ ...item }));
        }
        const records = await this.memoryStore.getAll(sessionId);
        const recordId = this.resolveRecordId(sessionId);
        const record = records
            .filter(item => item.scope === 'session' && item.sessionId === sessionId)
            .filter(item => item.id === recordId || item.key === TodoStore.TODO_MEMORY_KEY)
            .sort((left, right) => Number(right.updatedAt || right.createdAt || 0) - Number(left.updatedAt || left.createdAt || 0))[0];
        if (!record) {
            return [];
        }
        try {
            const parsed = JSON.parse(String(record.value || '[]'));
            return Array.isArray(parsed) ? parsed.map(item => normalizeItem(item)) : [];
        } catch {
            return [];
        }
    }

    async replace(sessionId: string, todos: any[]): Promise<TodoItem[]> {
        const next = new Map<string, TodoItem>();
        for (const raw of todos ?? []) {
            const item = normalizeItem(raw);
            next.delete(item.id);
            next.set(item.id, item);
        }
        const values = Array.from(next.values());
        await this.persist(sessionId, values);
        return this.read(sessionId);
    }

    async merge(sessionId: string, todos: any[]): Promise<TodoItem[]> {
        const current = await this.read(sessionId);
        const index = new Map(current.map((item, idx) => [item.id, idx] as const));
        const deduped = new Map<string, TodoItem>();
        for (const raw of todos ?? []) {
            const id = String(raw?.id ?? '').trim();
            if (!id) {
                continue;
            }
            deduped.set(id, normalizeItem(raw));
        }
        for (const item of deduped.values()) {
            const existingIndex = index.get(item.id);
            if (existingIndex == null) {
                index.set(item.id, current.length);
                current.push(item);
                continue;
            }
            current[existingIndex] = {
                ...current[existingIndex],
                content: item.content,
                status: item.status
            };
        }
        await this.persist(sessionId, current);
        return this.read(sessionId);
    }

    async summarize(sessionId: string): Promise<TodoSummary> {
        const todos = await this.read(sessionId);
        return todos.reduce<TodoSummary>((summary, item) => ({
            ...summary,
            total: summary.total + 1,
            [item.status]: (summary as any)[item.status] + 1
        }), {
            total: 0,
            pending: 0,
            in_progress: 0,
            completed: 0,
            cancelled: 0
        });
    }

    protected async persist(sessionId: string, todos: TodoItem[]): Promise<void> {
        if (!this.memoryStore) {
            this.sessions.set(sessionId, todos.map(item => ({ ...item })));
            return;
        }
        const recordId = this.resolveRecordId(sessionId);
        await this.memoryStore.delete(recordId, sessionId, 'session');
        if (!todos.length) {
            return;
        }
        const now = Date.now();
        await this.memoryStore.put({
            id: recordId,
            sessionId,
            key: TodoStore.TODO_MEMORY_KEY,
            value: JSON.stringify(todos),
            scope: 'session',
            namespace: 'agent',
            category: 'conversation',
            createdAt: now,
            updatedAt: now,
            metadata: { kind: 'todo-plan' }
        });
    }

    protected resolveRecordId(sessionId: string): string {
        return `${TodoStore.TODO_MEMORY_ID_PREFIX}:${String(sessionId || '').trim()}`;
    }
}
