import { Abstract } from '@tsdi/ioc';

export type GoalStatus = 'active' | 'completed' | 'cancelled';

export interface Goal {
    id: string;
    title: string;
    objective: string;
    successCriteria: string[];
    status: GoalStatus;
    createdAt: number;
    updatedAt: number;
    completedAt?: number;
}

export interface CreateGoalInput {
    id?: string;
    title: string;
    objective: string;
    successCriteria?: string[];
}

@Abstract()
export abstract class GoalStore {
    abstract create(input: CreateGoalInput): Promise<Goal>;
    abstract get(goalId: string): Promise<Goal | undefined>;
    abstract list(status?: GoalStatus): Promise<Goal[]>;
    abstract update(goalId: string, patch: Partial<Pick<Goal, 'title' | 'objective' | 'successCriteria' | 'status'>>): Promise<Goal>;
    abstract linkSession(sessionId: string, goalId?: string): Promise<void>;
    abstract getSessionGoal(sessionId: string): Promise<Goal | undefined>;
}

export function evaluateGoalCompletion(goal: Goal, assistantText: string): boolean {
    if (goal.status !== 'active' || !goal.successCriteria.length) return false;
    const text = normalizeGoalText(assistantText);
    return goal.successCriteria.every(criterion => text.includes(normalizeGoalText(criterion)));
}

export function buildGoalContext(goal: Goal): string {
    const criteria = goal.successCriteria.length
        ? goal.successCriteria.map(item => `- ${item}`).join('\n')
        : '- Completion requires explicit manual confirmation.';
    return `[Active Goal]\nTitle: ${goal.title}\nObjective: ${goal.objective}\nSuccess criteria:\n${criteria}\nContinue making concrete progress toward this goal. Do not claim completion unless every criterion is satisfied.`;
}

function normalizeGoalText(value: string): string {
    return String(value || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
