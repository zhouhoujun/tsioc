import { Inject, Injectable } from '@tsdi/ioc';
import { ApplicationContext } from '@tsdi/core';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { CreateGoalInput, Goal, GoalStatus, GoalStore } from './GoalStore';
import { InMemoryGoalStore } from './InMemoryGoalStore';
import { TypeOrmGoalStore } from './TypeOrmGoalStore';

@Injectable()
export class DefaultGoalStore extends GoalStore {
    private resolved?: GoalStore;
    constructor(@Inject(ApplicationContext) private app: ApplicationContext, private fallback: InMemoryGoalStore) { super(); }
    create(input: CreateGoalInput) { return this.store().create(input); }
    get(id: string) { return this.store().get(id); }
    list(status?: GoalStatus) { return this.store().list(status); }
    update(id: string, patch: Partial<Pick<Goal, 'title' | 'objective' | 'successCriteria' | 'status'>>) { return this.store().update(id, patch); }
    linkSession(sessionId: string, goalId?: string) { return this.store().linkSession(sessionId, goalId); }
    getSessionGoal(sessionId: string) { return this.store().getSessionGoal(sessionId); }
    private store(): GoalStore { if (this.resolved) return this.resolved; let adapter: TypeormAdapter | null = null; try { adapter = this.app?.get(TypeormAdapter, null) as TypeormAdapter | null; } catch {} return this.resolved = adapter ? new TypeOrmGoalStore(adapter) : this.fallback; }
}
