import { CreateGoalInput, Goal, GoalStatus, GoalStore, evaluateGoalCompletion } from '../goal/GoalStore';

export interface SessionGoalHost {
    goalStore?: GoalStore;
}

/** Goal CRUD plus automatic completion evaluation for a session's goal. */
export class SessionGoalController {
    constructor(private readonly host: SessionGoalHost) {
    }

    async create(input: CreateGoalInput, sessionId?: string): Promise<Goal> {
        const store = this.requireStore();
        const goal = await store.create(input);
        if (sessionId) {
            await store.linkSession(sessionId, goal.id);
        }
        return goal;
    }

    list(status?: GoalStatus): Promise<Goal[]> {
        return this.host.goalStore?.list(status) ?? Promise.resolve([]);
    }

    get(goalId: string): Promise<Goal | undefined> {
        return this.host.goalStore?.get(goalId) ?? Promise.resolve(undefined);
    }

    getSessionGoal(sessionId: string): Promise<Goal | undefined> {
        return this.host.goalStore?.getSessionGoal(sessionId) ?? Promise.resolve(undefined);
    }

    async linkSession(sessionId: string, goalId?: string): Promise<void> {
        await this.requireStore().linkSession(sessionId, goalId);
    }

    async update(goalId: string, patch: Partial<Pick<Goal, 'title' | 'objective' | 'successCriteria' | 'status'>>): Promise<Goal> {
        return this.requireStore().update(goalId, patch);
    }

    async evaluateCompletion(sessionId: string, assistantText: string): Promise<void> {
        const goal = await this.host.goalStore?.getSessionGoal(sessionId);
        if (goal && evaluateGoalCompletion(goal, assistantText)) {
            await this.host.goalStore!.update(goal.id, { status: 'completed' });
        }
    }

    private requireStore(): GoalStore {
        if (!this.host.goalStore) {
            throw new Error('Goal store unavailable.');
        }
        return this.host.goalStore;
    }
}
