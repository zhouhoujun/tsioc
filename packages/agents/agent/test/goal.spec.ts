import expect = require('expect');
import { Suite, Test, After } from '@tsdi/unit';
import { ApplicationContext, Application } from '@tsdi/core';
import { buildGoalContext, evaluateGoalCompletion } from '../src/goal';
import { GoalStore } from '../src/goal/GoalStore';
import { AgentModule } from '../src/agent.module';
import { provideAgentOrm } from '../src/orm.module';

@Suite('Agent goals (P83)')
export class GoalStoreTest {
    ctx!: ApplicationContext;

    @After()
    async clean() { await this.ctx?.close(); }

    @Test('creates, links, and restores a goal across sessions')
    async createsAndLinksAcrossSessions() {
        const ctx = await Application.run(AgentModule, { providers: provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any) });
        this.ctx = ctx;
        const store = ctx.get(GoalStore);
        const goal = await store.create({ title: 'Ship release', objective: 'Prepare version 1', successCriteria: ['tests pass'] });
        await store.linkSession('s1', goal.id);
        await store.linkSession('s2', goal.id);

        expect((await store.getSessionGoal('s1'))?.id).toEqual(goal.id);
        expect((await store.getSessionGoal('s2'))?.objective).toEqual('Prepare version 1');
        expect((await store.list('active')).map(item => item.id)).toEqual([goal.id]);
    }

    @Test('updates completion and can reopen a goal')
    async completesAndReopens() {
        const ctx = await Application.run(AgentModule, { providers: provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any) });
        this.ctx = ctx;
        const store = ctx.get(GoalStore);
        const goal = await store.create({ title: 'Release', objective: 'Ship it' });
        const completed = await store.update(goal.id, { status: 'completed' });
        expect(completed.completedAt).toBeTruthy();
        const reopened = await store.update(goal.id, { status: 'active' });
        expect(reopened.completedAt).toBeUndefined();
    }

    @Test('completion requires every explicit success criterion')
    async evaluatesAllCriteria() {
        const store = await this.ctxGetGoalStore();
        const goal = await store.create({
            title: 'Release', objective: 'Ship it', successCriteria: ['tests pass', 'build clean']
        });
        expect(evaluateGoalCompletion(goal, 'Tests pass.')).toEqual(false);
        expect(evaluateGoalCompletion(goal, 'Tests pass; build clean.')).toEqual(true);
        expect(evaluateGoalCompletion({ ...goal, successCriteria: [] }, 'done')).toEqual(false);
    }

    @Test('goal context carries objective and criteria')
    async buildsContext() {
        const store = await this.ctxGetGoalStore();
        const goal = await store.create({ title: 'Release', objective: 'Ship it', successCriteria: ['tests pass'] });
        const context = buildGoalContext(goal);
        expect(context).toContain('[Active Goal]');
        expect(context).toContain('Ship it');
        expect(context).toContain('- tests pass');
    }

    @Test('typeorm goal store persists goal state and session links')
    async persistsWithTypeOrm() {
        const ctx = await Application.run(AgentModule, { providers: provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any) });
        this.ctx = ctx;
        const store = ctx.get(GoalStore);
        const goal = await store.create({ title: 'Release', objective: 'Ship it', successCriteria: ['tests pass'] });
        await store.linkSession('persisted-session', goal.id);
        await store.update(goal.id, { status: 'completed' });
        expect((await store.getSessionGoal('persisted-session'))?.status).toEqual('completed');
        expect((await store.get(goal.id))?.completedAt).toBeTruthy();
    }

    private async ctxGetGoalStore() {
        const ctx = await Application.run(AgentModule, { providers: provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any) });
        this.ctx = ctx;
        return ctx.get(GoalStore);
    }
}
