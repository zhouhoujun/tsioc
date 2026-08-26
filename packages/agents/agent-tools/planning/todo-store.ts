import { MemoryStore } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';

export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export type TodoItemKind = 'task' | 'milestone' | 'bug' | 'feature' | 'chore';

export interface TodoItem {
    id: string;
    content: string;
    status: TodoStatus;
    /** Schema version. Absent or 0 = v1 legacy. 2 = v2 with extended fields. */
    schemaVersion?: number;
    /** Parent item id for hierarchical plans. */
    parentId?: string;
    /** Classification of the item. */
    kind?: TodoItemKind;
    /** Free-text acceptance criteria. */
    acceptance?: string;
    /** Ids of items that must complete before this one can start. */
    dependsOn?: string[];
    /** Estimated effort (e.g. '1h', '30m', '2d'). */
    estimate?: string;
    /** Responsible agent or role name. */
    owner?: string;
    /** Last modification timestamp (ms since epoch). */
    updatedAt?: number;
}

export interface TodoSummary {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    cancelled: number;
}

export interface TodoValidationResult {
    valid: boolean;
    errors: string[];
}

const VALID_STATUSES: TodoStatus[] = ['pending', 'in_progress', 'completed', 'cancelled'];
const VALID_KINDS: TodoItemKind[] = ['task', 'milestone', 'bug', 'feature', 'chore'];

function normalizeStatus(status: unknown): TodoStatus {
    const value = typeof status === 'string' ? status.trim().toLowerCase() : '';
    return (VALID_STATUSES as string[]).includes(value) ? value as TodoStatus : 'pending';
}

function normalizeKind(value: unknown): TodoItemKind | undefined {
    if (value == null) {
        return undefined;
    }
    const str = String(value).trim().toLowerCase();
    return (VALID_KINDS as string[]).includes(str) ? str as TodoItemKind : undefined;
}

function normalizeOptionalStringArray(value: unknown): string[] | undefined {
    if (!Array.isArray(value) || value.length === 0) {
        return undefined;
    }
    const result = value
        .map(item => String(item ?? '').trim())
        .filter(item => item.length > 0);
    return result.length > 0 ? result : undefined;
}

function normalizeItem(input: any): TodoItem {
    const id = String(input?.id ?? '?').trim() || '?';
    const content = String(input?.content ?? '(no description)').trim() || '(no description)';
    const item: TodoItem = {
        id,
        content,
        status: normalizeStatus(input?.status)
    };
    if (input?.schemaVersion) {
        item.schemaVersion = Number(input.schemaVersion) || undefined;
    }
    if (typeof input?.parentId === 'string' && input.parentId.trim()) {
        item.parentId = input.parentId.trim();
    }
    const kind = normalizeKind(input?.kind);
    if (kind) {
        item.kind = kind;
    }
    if (typeof input?.acceptance === 'string' && input.acceptance.trim()) {
        item.acceptance = input.acceptance.trim();
    }
    const dependsOn = normalizeOptionalStringArray(input?.dependsOn);
    if (dependsOn) {
        item.dependsOn = dependsOn;
    }
    if (typeof input?.estimate === 'string' && input.estimate.trim()) {
        item.estimate = input.estimate.trim();
    }
    if (typeof input?.owner === 'string' && input.owner.trim()) {
        item.owner = input.owner.trim();
    }
    if (typeof input?.updatedAt === 'number' && input.updatedAt > 0) {
        item.updatedAt = input.updatedAt;
    }
    return item;
}

export function validateTodos(todos: TodoItem[]): TodoValidationResult {
    const errors: string[] = [];
    const ids = new Set<string>();
    const idList: string[] = [];

    for (const item of todos) {
        if (ids.has(item.id)) {
            errors.push(`Duplicate id: "${item.id}"`);
        } else {
            ids.add(item.id);
            idList.push(item.id);
        }
    }

    for (const item of todos) {
        if (item.parentId && !ids.has(item.parentId)) {
            errors.push(`Item "${item.id}" references missing parent "${item.parentId}"`);
        }
        if (item.dependsOn) {
            for (const dep of item.dependsOn) {
                if (!ids.has(dep)) {
                    errors.push(`Item "${item.id}" depends on missing item "${dep}"`);
                }
            }
        }
    }

    if (detectCycle(todos)) {
        errors.push('Dependency cycle detected');
    }

    const inProgressCount = todos.filter(t => t.status === 'in_progress').length;
    if (inProgressCount > 1) {
        errors.push(`Multiple items in_progress: ${inProgressCount} (expected at most 1)`);
    }

    const blockers = todos.filter(t =>
        t.status === 'in_progress' &&
        t.dependsOn?.some(dep => {
            const depItem = todos.find(d => d.id === dep);
            return depItem && depItem.status !== 'completed' && depItem.status !== 'cancelled';
        })
    );
    for (const item of blockers) {
        errors.push(`Item "${item.id}" is in_progress but has unfinished dependencies`);
    }

    return { valid: errors.length === 0, errors };
}

function detectCycle(todos: TodoItem[]): boolean {
    const idSet = new Set(todos.map(t => t.id));
    const adj = new Map<string, string[]>();
    for (const item of todos) {
        adj.set(item.id, (item.dependsOn ?? []).filter(dep => idSet.has(dep)));
    }
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map<string, number>();
    for (const id of idSet) {
        color.set(id, WHITE);
    }
    for (const id of idSet) {
        if (color.get(id) !== WHITE) {
            continue;
        }
        const stack = [id];
        while (stack.length > 0) {
            const v = stack[stack.length - 1];
            const c = color.get(v);
            if (c === WHITE) {
                color.set(v, GRAY);
                for (const w of adj.get(v) ?? []) {
                    const wc = color.get(w);
                    if (wc === WHITE) {
                        stack.push(w);
                    } else if (wc === GRAY) {
                        return true;
                    }
                }
            } else {
                color.set(v, BLACK);
                stack.pop();
            }
        }
    }
    return false;
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
                status: item.status,
                ...(item.parentId !== undefined && { parentId: item.parentId }),
                ...(item.kind !== undefined && { kind: item.kind }),
                ...(item.acceptance !== undefined && { acceptance: item.acceptance }),
                ...(item.dependsOn !== undefined && { dependsOn: item.dependsOn }),
                ...(item.estimate !== undefined && { estimate: item.estimate }),
                ...(item.owner !== undefined && { owner: item.owner })
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

    async validate(sessionId: string): Promise<TodoValidationResult> {
        const todos = await this.read(sessionId);
        return validateTodos(todos);
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
