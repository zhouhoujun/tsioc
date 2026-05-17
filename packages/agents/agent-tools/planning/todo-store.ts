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

export class TodoStore {
    private sessions = new Map<string, TodoItem[]>();

    read(sessionId: string): TodoItem[] {
        return (this.sessions.get(sessionId) ?? []).map(item => ({ ...item }));
    }

    replace(sessionId: string, todos: any[]): TodoItem[] {
        const next = new Map<string, TodoItem>();
        for (const raw of todos ?? []) {
            const item = normalizeItem(raw);
            next.delete(item.id);
            next.set(item.id, item);
        }
        const values = Array.from(next.values());
        this.sessions.set(sessionId, values);
        return this.read(sessionId);
    }

    merge(sessionId: string, todos: any[]): TodoItem[] {
        const current = this.read(sessionId);
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
        this.sessions.set(sessionId, current);
        return this.read(sessionId);
    }

    summarize(sessionId: string): TodoSummary {
        const todos = this.read(sessionId);
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
}
