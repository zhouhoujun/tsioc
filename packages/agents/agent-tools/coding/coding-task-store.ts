import { Injectable } from '@tsdi/ioc';

export type CodingTaskStatus = 'planned' | 'running' | 'completed' | 'failed' | 'cancelled' | 'rolled_back';
export type CodingTaskActionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type CodingTaskPlanningStrategy = 'llm' | 'heuristic';
export type CodingTaskComplexity = 'simple' | 'moderate' | 'complex';
export type CodingTaskExecutionMode = 'sequential' | 'parallel';
export type CodingTaskCheckpointMode = 'worktree' | 'parallel_worktree';
export type CodingTaskCheckpointStatus = 'available' | 'applied' | 'invalidated';

export interface CodingTaskActionRecord {
    id: string;
    title: string;
    tool: string;
    input: Record<string, any>;
    status: CodingTaskActionStatus;
    workerId?: string;
    startedAt?: number;
    completedAt?: number;
    result?: any;
    error?: string;
}

export interface CodingTaskWorkerRecord {
    workerId: string;
    actionIds: string[];
    status: 'completed' | 'failed';
    startedAt?: number;
    completedAt?: number;
    branch?: string;
    worktreePath?: string;
    diff?: any;
    output?: any;
    error?: string;
    report?: CodingTaskReport;
}

export interface CodingTaskReport {
    summary?: string;
    completed?: string[];
    nextSteps?: string[];
    risks?: string[];
    artifacts?: string[];
}

export interface CodingTaskCheckpointPatch {
    workerId?: string;
    branch?: string;
    worktreePath?: string;
    patch: string;
}

export interface CodingTaskCheckpointRecord {
    id: string;
    label: string;
    taskId: string;
    createdAt: number;
    mode: CodingTaskCheckpointMode;
    status: CodingTaskCheckpointStatus;
    branch?: string;
    worktreePath?: string;
    patches: CodingTaskCheckpointPatch[];
    appliedAt?: number;
    reason?: string;
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
        executionMode: CodingTaskExecutionMode;
        completedActions: number;
        failedActionId?: string;
        output?: any;
        diff?: any;
        workers?: CodingTaskWorkerRecord[];
        report?: CodingTaskReport;
        error?: string;
        rollback?: {
            available: boolean;
            checkpointId?: string;
            mode?: CodingTaskCheckpointMode;
            rolledBackAt?: number;
            reason?: string;
        };
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
        if (current.status === 'cancelled') {
            throw new Error(`Coding task '${taskId}' has already been cancelled.`);
        }
        if (current.status === 'completed' || current.status === 'failed' || current.status === 'rolled_back') {
            throw new Error(`Coding task '${taskId}' is ${current.status} and cannot be cancelled.`);
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
