import { Injectable } from '@tsdi/ioc';

export type CodingTaskStatus = 'planned' | 'running' | 'completed' | 'failed' | 'cancelled';
export type CodingTaskActionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type CodingTaskPlanningStrategy = 'llm' | 'heuristic';
export type CodingTaskComplexity = 'simple' | 'moderate' | 'complex';

export interface CodingTaskActionRecord {
    id: string;
    title: string;
    tool: string;
    input: Record<string, any>;
    status: CodingTaskActionStatus;
    startedAt?: number;
    completedAt?: number;
    result?: any;
    error?: string;
}

export interface CodingTaskRecord {
    id: string;
    title: string;
    goal: string;
    status: CodingTaskStatus;
    createdAt: number;
    updatedAt: number;
    planning: {
        strategy: CodingTaskPlanningStrategy;
        complexity: CodingTaskComplexity;
        model?: string;
        summary?: string;
        steps: string[];
        successCriteria: string[];
        fallbackReason?: string;
    };
    actions: CodingTaskActionRecord[];
    result?: {
        completedActions: number;
        failedActionId?: string;
        output?: any;
        diff?: any;
        error?: string;
    };
    metadata?: Record<string, any>;
}

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
}

@Injectable()
export class CodingTaskStore {
    private readonly sessions = new Map<string, Map<string, CodingTaskRecord>>();

    list(sessionId: string): CodingTaskRecord[] {
        return Array.from(this.getSession(sessionId).values())
            .sort((left, right) => right.updatedAt - left.updatedAt)
            .map(task => clone(task));
    }

    get(sessionId: string, taskId: string): CodingTaskRecord | null {
        const task = this.getSession(sessionId).get(taskId);
        return task ? clone(task) : null;
    }

    save(sessionId: string, task: CodingTaskRecord): CodingTaskRecord {
        this.getSession(sessionId).set(task.id, clone(task));
        return this.get(sessionId, task.id)!;
    }

    patch(sessionId: string, taskId: string, patch: Partial<CodingTaskRecord>): CodingTaskRecord {
        const current = this.getSession(sessionId).get(taskId);
        if (!current) {
            throw new Error(`Coding task '${taskId}' not found.`);
        }
        const next: CodingTaskRecord = {
            ...current,
            ...clone(patch),
            id: current.id,
            createdAt: current.createdAt,
            updatedAt: Date.now()
        };
        this.getSession(sessionId).set(taskId, next);
        return this.get(sessionId, taskId)!;
    }

    cancel(sessionId: string, taskId: string): CodingTaskRecord {
        const current = this.get(sessionId, taskId);
        if (!current) {
            throw new Error(`Coding task '${taskId}' not found.`);
        }
        current.status = 'cancelled';
        current.updatedAt = Date.now();
        current.actions = current.actions.map(action => (
            action.status === 'completed' || action.status === 'failed'
                ? action
                : { ...action, status: 'cancelled', completedAt: current.updatedAt }
        ));
        this.getSession(sessionId).set(taskId, clone(current));
        return this.get(sessionId, taskId)!;
    }

    private getSession(sessionId: string): Map<string, CodingTaskRecord> {
        let session = this.sessions.get(sessionId);
        if (!session) {
            session = new Map<string, CodingTaskRecord>();
            this.sessions.set(sessionId, session);
        }
        return session;
    }
}
