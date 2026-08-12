import { Inject, Injectable } from '@tsdi/ioc';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { AgentGoalEntity } from '../memory/entities';
import { CreateGoalInput, Goal, GoalStatus, GoalStore } from './GoalStore';

@Injectable()
export class TypeOrmGoalStore extends GoalStore {
    constructor(@Inject(TypeormAdapter) private adapter: TypeormAdapter) {
        super();
    }

    async create(input: CreateGoalInput): Promise<Goal> {
        const now = Date.now();
        const repo = this.adapter.getRepository(AgentGoalEntity);
        const goal: Goal = {
            id: input.id || `goal-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
            title: required(input.title),
            objective: required(input.objective),
            successCriteria: normalize(input.successCriteria),
            status: 'active', createdAt: now, updatedAt: now
        };
        await repo.save(repo.create({ ...goal, sessionIds: [], completedAt: null }));
        return goal;
    }

    async get(id: string): Promise<Goal | undefined> {
        const value = await this.adapter.getRepository(AgentGoalEntity).findOne({ where: { id } as any });
        return value ? toGoal(value) : undefined;
    }

    async list(status?: GoalStatus): Promise<Goal[]> {
        const values = await this.adapter.getRepository(AgentGoalEntity).find({
            where: status ? { status } as any : undefined,
            order: { updatedAt: 'DESC' } as any
        });
        return values.map(toGoal);
    }

    async update(id: string, patch: Partial<Pick<Goal, 'title' | 'objective' | 'successCriteria' | 'status'>>): Promise<Goal> {
        const repo = this.adapter.getRepository(AgentGoalEntity);
        const entity = await repo.findOne({ where: { id } as any });
        if (!entity) throw new Error(`Goal '${id}' not found.`);
        if (patch.title !== undefined) entity.title = required(patch.title);
        if (patch.objective !== undefined) entity.objective = required(patch.objective);
        if (patch.successCriteria !== undefined) entity.successCriteria = normalize(patch.successCriteria);
        if (patch.status) entity.status = patch.status;
        entity.updatedAt = Date.now();
        if (patch.status === 'completed') entity.completedAt = entity.updatedAt;
        else if (patch.status === 'active') entity.completedAt = null;
        await repo.save(entity);
        return toGoal(entity);
    }

    async linkSession(sessionId: string, goalId?: string): Promise<void> {
        const repo = this.adapter.getRepository(AgentGoalEntity);
        const values = await repo.find();
        if (goalId && !values.some(item => item.id === goalId)) throw new Error(`Goal '${goalId}' not found.`);
        for (const entity of values) {
            const next = (entity.sessionIds || []).filter(id => id !== sessionId);
            if (goalId === entity.id) next.push(sessionId);
            if (next.length !== (entity.sessionIds || []).length || goalId === entity.id) {
                entity.sessionIds = [...new Set(next)];
                await repo.save(entity);
            }
        }
    }
    async getSessionGoal(sessionId: string): Promise<Goal | undefined> {
        const values = await this.adapter.getRepository(AgentGoalEntity).find({ order: { updatedAt: 'DESC' } as any });
        const entity = values.find(item => (item.sessionIds || []).includes(sessionId));
        return entity ? toGoal(entity) : undefined;
    }
}
function required(value: string): string {
    const text = String(value || '').trim();
    if (!text) throw new Error('Goal field is required.');
    return text;
}
function normalize(values?: string[]): string[] {
    return [...new Set((values || []).map(String).map(item => item.trim()).filter(Boolean))];
}
function toGoal(value: AgentGoalEntity): Goal {
    return {
        id: value.id, title: value.title, objective: value.objective,
        successCriteria: [...(value.successCriteria || [])], status: value.status as GoalStatus,
        createdAt: Number(value.createdAt), updatedAt: Number(value.updatedAt),
        ...(value.completedAt != null ? { completedAt: Number(value.completedAt) } : {})
    };
}
