import { Injectable } from '@tsdi/ioc';
import { CreateGoalInput, Goal, GoalStatus, GoalStore } from './GoalStore';

@Injectable()
export class InMemoryGoalStore extends GoalStore {
    private readonly goals = new Map<string, Goal>();
    private readonly sessionGoals = new Map<string, string>();

    async create(input: CreateGoalInput): Promise<Goal> {
        const now = Date.now();
        const goal: Goal = {
            id: String(input.id || `goal-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`),
            title: required(input.title, 'title'),
            objective: required(input.objective, 'objective'),
            successCriteria: normalizeCriteria(input.successCriteria),
            status: 'active', createdAt: now, updatedAt: now
        };
        this.goals.set(goal.id, goal);
        return clone(goal);
    }

    async get(goalId: string): Promise<Goal | undefined> {
        const goal = this.goals.get(goalId);
        return goal ? clone(goal) : undefined;
    }

    async list(status?: GoalStatus): Promise<Goal[]> {
        return [...this.goals.values()].filter(goal => !status || goal.status === status)
            .sort((a, b) => b.updatedAt - a.updatedAt).map(clone);
    }

    async update(goalId: string, patch: Partial<Pick<Goal, 'title' | 'objective' | 'successCriteria' | 'status'>>): Promise<Goal> {
        const current = this.goals.get(goalId);
        if (!current) throw new Error(`Goal '${goalId}' not found.`);
        const now = Date.now();
        const next: Goal = {
            ...current,
            ...(patch.title !== undefined ? { title: required(patch.title, 'title') } : {}),
            ...(patch.objective !== undefined ? { objective: required(patch.objective, 'objective') } : {}),
            ...(patch.successCriteria !== undefined ? { successCriteria: normalizeCriteria(patch.successCriteria) } : {}),
            ...(patch.status ? { status: patch.status } : {}),
            updatedAt: now,
            completedAt: patch.status === 'completed' ? now : patch.status === 'active' ? undefined : current.completedAt
        };
        this.goals.set(goalId, next);
        return clone(next);
    }

    async linkSession(sessionId: string, goalId?: string): Promise<void> {
        if (!goalId) { this.sessionGoals.delete(sessionId); return; }
        if (!this.goals.has(goalId)) throw new Error(`Goal '${goalId}' not found.`);
        this.sessionGoals.set(sessionId, goalId);
    }

    async getSessionGoal(sessionId: string): Promise<Goal | undefined> {
        const id = this.sessionGoals.get(sessionId);
        return id ? this.get(id) : undefined;
    }
}

function required(value: string, field: string): string {
    const normalized = String(value || '').trim();
    if (!normalized) throw new Error(`Goal ${field} is required.`);
    return normalized;
}

function normalizeCriteria(items?: string[]): string[] {
    return [...new Set((items || []).map(item => String(item).trim()).filter(Boolean))];
}

function clone(goal: Goal): Goal { return { ...goal, successCriteria: [...goal.successCriteria] }; }
