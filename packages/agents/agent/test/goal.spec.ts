import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { buildGoalContext, evaluateGoalCompletion, InMemoryGoalStore } from '../src/goal';
import { TypeOrmGoalStore } from '../src/goal/TypeOrmGoalStore';
import { Application, DefaultModuleLoader, ModuleLoader } from '@tsdi/core';
import { Module } from '@tsdi/ioc';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { AgentOrmModule } from '../src/orm.module';

@Module({
    imports: [AgentOrmModule.withConnection({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any)],
    providers: [{ provide: ModuleLoader, useValue: new DefaultModuleLoader() }]
})
class GoalOrmTestModule {}

@Suite('Agent goals (P83)')
export class GoalStoreTest {
    @Test('creates, links, and restores a goal across sessions')
    async createsAndLinksAcrossSessions() {
        const store = new InMemoryGoalStore();
        const goal = await store.create({ title: 'Ship release', objective: 'Prepare version 1', successCriteria: ['tests pass'] });
        await store.linkSession('s1', goal.id);
        await store.linkSession('s2', goal.id);

        expect((await store.getSessionGoal('s1'))?.id).toEqual(goal.id);
        expect((await store.getSessionGoal('s2'))?.objective).toEqual('Prepare version 1');
        expect((await store.list('active')).map(item => item.id)).toEqual([goal.id]);
    }

    @Test('updates completion and can reopen a goal')
    async completesAndReopens() {
        const store = new InMemoryGoalStore();
        const goal = await store.create({ title: 'Release', objective: 'Ship it' });
        const completed = await store.update(goal.id, { status: 'completed' });
        expect(completed.completedAt).toBeTruthy();
        const reopened = await store.update(goal.id, { status: 'active' });
        expect(reopened.completedAt).toBeUndefined();
    }

    @Test('completion requires every explicit success criterion')
    async evaluatesAllCriteria() {
        const store = new InMemoryGoalStore();
        const goal = await store.create({
            title: 'Release', objective: 'Ship it', successCriteria: ['tests pass', 'build clean']
        });
        expect(evaluateGoalCompletion(goal, 'Tests pass.')).toEqual(false);
        expect(evaluateGoalCompletion(goal, 'Tests pass; build clean.')).toEqual(true);
        expect(evaluateGoalCompletion({ ...goal, successCriteria: [] }, 'done')).toEqual(false);
    }

    @Test('goal context carries objective and criteria')
    async buildsContext() {
        const store = new InMemoryGoalStore();
        const goal = await store.create({ title: 'Release', objective: 'Ship it', successCriteria: ['tests pass'] });
        const context = buildGoalContext(goal);
        expect(context).toContain('[Active Goal]');
        expect(context).toContain('Ship it');
        expect(context).toContain('- tests pass');
    }

    @Test('typeorm goal store persists goal state and session links')
    async persistsWithTypeOrm() {
        const ctx = await Application.run(GoalOrmTestModule);
        try {
            const store = new TypeOrmGoalStore(ctx.get(TypeormAdapter) as TypeormAdapter);
            const goal = await store.create({ title: 'Release', objective: 'Ship it', successCriteria: ['tests pass'] });
            await store.linkSession('persisted-session', goal.id);
            await store.update(goal.id, { status: 'completed' });
            expect((await store.getSessionGoal('persisted-session'))?.status).toEqual('completed');
            expect((await store.get(goal.id))?.completedAt).toBeTruthy();
        } finally { await ctx.close(); }
    }
}
