import { MemoryStore } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';

export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'failed';

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

export interface TodoPlanSnapshot {
    planId: string;
    revision: number;
    todos: TodoItem[];
}

export interface TodoPlanConflict {
    conflict: true;
    expectedRevision: number;
    current: TodoPlanSnapshot;
}

export interface TodoValidationResult {
    valid: boolean;
    errors: string[];
}

export interface PlanQualitySuggestion {
    itemId: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
    suggestion?: string;
}

export interface PlanQualityResult {
    valid: boolean;
    score: number;
    suggestions: PlanQualitySuggestion[];
}

export type TodoScheduleState = 'ready' | 'running' | 'blocked' | 'failed' | 'skipped' | 'completed';

export interface TodoScheduleEntry {
    id: string;
    content?: string;
    state: TodoScheduleState;
    dependsOn?: string[];
    /** Which unfinished deps block this item. Empty when ready/running. */
    blockedBy?: string[];
    error?: string;
}

export interface TodoScheduleResult {
    ready: TodoScheduleEntry[];
    running: TodoScheduleEntry[];
    blocked: TodoScheduleEntry[];
    failed: TodoScheduleEntry[];
    skipped: TodoScheduleEntry[];
    completed: TodoScheduleEntry[];
    all: TodoScheduleEntry[];
    summary: {
        total: number;
        ready: number;
        running: number;
        blocked: number;
        failed: number;
        skipped: number;
        completed: number;
    };
}

/**
 * Compute DAG schedule from a list of todos.
 *
 * Resolution rules (aligned with coding_task semantics):
 * - `completed`/`cancelled` items → state `'completed'` (treat cancelled as done for deps)
 * - `in_progress` items → state `'running'`
 * - `failed` items → state `'failed'`, ALL transitive dependents → `'skipped'`
 * - Items whose deps are all completed → `'ready'`
 * - Items with unfinished deps → `'blocked'` with `blockedBy` listing the unmet deps
 * - Already-completed/skipped items downstream of a failure → `'skipped'` (preserve successful artifacts)
 */
export function resolveSchedule(todos: TodoItem[]): TodoScheduleResult {
    const byId = new Map(todos.map(t => [t.id, t]));
    const idSet = new Set(todos.map(t => t.id));

    const children = new Map<string, string[]>();
    for (const item of todos) {
        for (const dep of item.dependsOn ?? []) {
            if (idSet.has(dep)) {
                if (!children.has(dep)) children.set(dep, []);
                children.get(dep)!.push(item.id);
            }
        }
    }

    function transitiveDependents(failedIds: Set<string>): Set<string> {
        const result = new Set<string>();
        const queue = [...failedIds];
        while (queue.length > 0) {
            const current = queue.shift()!;
            for (const childId of children.get(current) ?? []) {
                if (!result.has(childId) && !failedIds.has(childId)) {
                    result.add(childId);
                    queue.push(childId);
                }
            }
        }
        return result;
    }

    const failedIds = new Set<string>();
    for (const item of todos) {
        if (item.status === 'failed') {
            failedIds.add(item.id);
        }
    }
    const skippedIds = transitiveDependents(failedIds);

    const entries: TodoScheduleEntry[] = [];
    for (const item of todos) {
        const deps = (item.dependsOn ?? []).filter(d => idSet.has(d));

        if (item.status === 'completed' || item.status === 'cancelled') {
            entries.push({ id: item.id, content: item.content, state: 'completed', dependsOn: item.dependsOn });
            continue;
        }

        if (failedIds.has(item.id)) {
            entries.push({ id: item.id, content: item.content, state: 'failed', dependsOn: item.dependsOn });
            continue;
        }

        if (skippedIds.has(item.id)) {
            entries.push({ id: item.id, content: item.content, state: 'skipped', dependsOn: item.dependsOn });
            continue;
        }

        if (item.status === 'in_progress') {
            entries.push({ id: item.id, content: item.content, state: 'running', dependsOn: item.dependsOn });
            continue;
        }

        const unmetDeps = deps.filter(depId => {
            const depItem = byId.get(depId);
            return depItem && depItem.status !== 'completed' && depItem.status !== 'cancelled';
        });

        if (unmetDeps.length > 0) {
            entries.push({ id: item.id, content: item.content, state: 'blocked', dependsOn: item.dependsOn, blockedBy: unmetDeps });
        } else {
            entries.push({ id: item.id, content: item.content, state: 'ready', dependsOn: item.dependsOn });
        }
    }

    const ready = entries.filter(e => e.state === 'ready');
    const running = entries.filter(e => e.state === 'running');
    const blocked = entries.filter(e => e.state === 'blocked');
    const failed = entries.filter(e => e.state === 'failed');
    const skipped = entries.filter(e => e.state === 'skipped');
    const completed = entries.filter(e => e.state === 'completed');

    return {
        ready,
        running,
        blocked,
        failed,
        skipped,
        completed,
        all: entries,
        summary: {
            total: entries.length,
            ready: ready.length,
            running: running.length,
            blocked: blocked.length,
            failed: failed.length,
            skipped: skipped.length,
            completed: completed.length
        }
    };
}

const VALID_STATUSES: TodoStatus[] = ['pending', 'in_progress', 'completed', 'cancelled', 'failed'];
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

function normalizeItem(input: any, existing?: TodoItem): TodoItem {
    const id = String(input?.id ?? existing?.id ?? '?').trim() || '?';
    const content = input?.content !== undefined
        ? (String(input.content ?? '').trim() || '(no description)')
        : (existing?.content ?? '(no description)');
    const item: TodoItem = {
        id,
        content,
        status: input?.status !== undefined ? normalizeStatus(input.status) : (existing?.status ?? 'pending')
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

const SINGLE_ACTION_PATTERNS = /\b(and then|also add|as well as|同时|另外|并且|然后再)\b/i;
const MIN_CONTENT_LENGTH = 8;
const MAX_CONTENT_LENGTH = 200;
const COARSE_CONTENT_LENGTH = 300;

export function validatePlanQuality(todos: TodoItem[]): PlanQualityResult {
    const suggestions: PlanQualitySuggestion[] = [];
    let score = 100;

    if (todos.length === 0) {
        return { valid: true, score: 100, suggestions: [] };
    }

    const contentSeen = new Map<string, string>();
    const idSet = new Set(todos.map(t => t.id));
    const idPosition = new Map(todos.map((t, i) => [t.id, i]));

    for (const item of todos) {
        const content = (item.content || '').trim();

        if (content.length < MIN_CONTENT_LENGTH) {
            suggestions.push({
                itemId: item.id,
                severity: 'warning',
                message: `Content too short (${content.length} chars) — likely too vague`,
                suggestion: 'Expand to describe the specific action and expected output'
            });
            score -= 5;
        }

        if (content.length > COARSE_CONTENT_LENGTH) {
            suggestions.push({
                itemId: item.id,
                severity: 'warning',
                message: `Content very long (${content.length} chars) — may describe multiple actions`,
                suggestion: 'Split into smaller, single-action steps'
            });
            score -= 5;
        }

        if (SINGLE_ACTION_PATTERNS.test(content)) {
            suggestions.push({
                itemId: item.id,
                severity: 'error',
                message: 'Content appears to describe multiple actions',
                suggestion: 'Each step should be a single atomic action. Split conjunction phrases into separate steps'
            });
            score -= 15;
        }

        if (item.status !== 'completed' && item.status !== 'cancelled') {
            if (!item.acceptance) {
                suggestions.push({
                    itemId: item.id,
                    severity: 'info',
                    message: 'No acceptance criteria defined',
                    suggestion: 'Add an "acceptance" field describing how to verify this step is done'
                });
                score -= 3;
            }
        }

        const normalizedContent = content.toLowerCase().replace(/\s+/g, ' ');
        if (contentSeen.has(normalizedContent)) {
            suggestions.push({
                itemId: item.id,
                severity: 'error',
                message: `Duplicate content with item "${contentSeen.get(normalizedContent)}"`,
                suggestion: 'Remove the duplicate or differentiate the items'
            });
            score -= 10;
        } else {
            contentSeen.set(normalizedContent, item.id);
        }

        if (item.dependsOn) {
            for (const depId of item.dependsOn) {
                const depPos = idPosition.get(depId);
                const myPos = idPosition.get(item.id);
                if (depPos !== undefined && myPos !== undefined && depPos > myPos) {
                    suggestions.push({
                        itemId: item.id,
                        severity: 'warning',
                        message: `Depends on "${depId}" which appears later in the list`,
                        suggestion: 'Reorder so dependencies come before dependent items'
                    });
                    score -= 5;
                }
            }
        }
    }

    return {
        valid: !suggestions.some(s => s.severity === 'error'),
        score: Math.max(0, score),
        suggestions
    };
}

@Injectable()
export class TodoStore {
    protected static readonly TODO_MEMORY_ID_PREFIX = 'agent-todo';
    protected static readonly TODO_MEMORY_KEY = 'agent.todo.plan';
    private sessions = new Map<string, TodoItem[]>();
    private revisions = new Map<string, { planId: string; revision: number }>();

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
            const todos = Array.isArray(parsed) ? parsed : parsed?.todos;
            if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') {
                this.revisions.set(sessionId, { planId: String(parsed.planId || this.resolvePlanId(sessionId)), revision: Number(parsed.revision) || 1 });
            }
            return Array.isArray(todos) ? todos.map(item => normalizeItem(item)) : [];
        } catch {
            return [];
        }
    }

    async readPlan(sessionId: string): Promise<TodoPlanSnapshot> {
        const todos = await this.read(sessionId);
        const meta = this.revisions.get(sessionId) || { planId: this.resolvePlanId(sessionId), revision: todos.length ? 1 : 0 };
        this.revisions.set(sessionId, meta);
        return { planId: meta.planId, revision: meta.revision, todos };
    }

    async replaceAtRevision(sessionId: string, todos: any[], expectedRevision?: number): Promise<TodoItem[] | TodoPlanConflict> {
        const current = await this.readPlan(sessionId);
        if (expectedRevision !== undefined && expectedRevision !== current.revision) {
            return { conflict: true, expectedRevision, current };
        }
        const result = await this.replace(sessionId, todos);
        return result;
    }

    async mergeAtRevision(sessionId: string, todos: any[], expectedRevision?: number): Promise<TodoItem[] | TodoPlanConflict> {
        const current = await this.readPlan(sessionId);
        if (expectedRevision !== undefined && expectedRevision !== current.revision) {
            return { conflict: true, expectedRevision, current };
        }
        return this.merge(sessionId, todos);
    }

    async replace(sessionId: string, todos: any[]): Promise<TodoItem[]> {
        const current = await this.read(sessionId);
        const existingById = new Map(current.map(item => [item.id, item] as const));
        const next = new Map<string, TodoItem>();
        for (const raw of todos ?? []) {
            const id = String(raw?.id ?? '').trim();
            const item = normalizeItem(raw, id ? existingById.get(id) : undefined);
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
            const existingIndex = index.get(id);
            deduped.set(id, normalizeItem(raw, existingIndex != null ? current[existingIndex] : undefined));
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
        const current = this.revisions.get(sessionId) || { planId: this.resolvePlanId(sessionId), revision: 0 };
        const nextMeta = { planId: current.planId, revision: current.revision + 1 };
        this.revisions.set(sessionId, nextMeta);
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
            value: JSON.stringify({ version: 3, ...nextMeta, todos }),
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

    protected resolvePlanId(sessionId: string): string {
        return `plan:${String(sessionId || '').trim()}`;
    }
}
