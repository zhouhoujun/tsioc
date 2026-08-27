import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState } from '../src/AgentConsoleSessionState';

@Suite('P229 plan-first thread renderer')
export class PlanThreadSuite {
    protected createState(): AgentConsoleSessionState {
        return new AgentConsoleSessionState();
    }

    @Test('mergePlanCreated seeds the plan thread and stamps stable planId/revision on each step')
    mergePlanCreatedSeedsPlanThread() {
        const state = this.createState();
        state.mergePlanCreated([
            { id: 'a', content: 'setup', status: 'pending', dependsOn: [], owner: 'bob', estimate: '5m', kind: 'task' },
            { id: 'b', content: 'build', status: 'pending', parentId: 'a', dependsOn: ['a'], owner: 'eve' }
        ], 'plan-1', 2, 10);

        expect(state.planId).toEqual('plan-1');
        expect(state.planRevision).toEqual(2);
        expect(state.planThreadKey).toEqual('plan-1#r2');
        expect(state.planTodos).toHaveLength(2);
        expect(state.planTodos[0]).toMatchObject({ id: 'a', planId: 'plan-1', revision: 2, owner: 'bob' });
        expect(state.planTodos[1]).toMatchObject({ id: 'b', parentId: 'a', dependsOn: ['a'] });
        const display = state.displayMessages.find(m => m.id === '__plan_todo_inline__');
        expect(display).toBeTruthy();
        expect(display?.metadata?.planId).toEqual('plan-1');
        expect(display?.metadata?.planThreadKey).toEqual('plan-1#r2');
    }

    @Test('mergePlanStepStatus updates a step in place keyed by stepId')
    mergePlanStepStatusUpdatesInPlace() {
        const state = this.createState();
        state.mergePlanCreated([
            { id: 'a', content: 'setup', status: 'pending' },
            { id: 'b', content: 'build', status: 'pending' }
        ], 'plan-1', 1, 1);

        const updated = state.mergePlanStepStatus('plan-1', 'a', 'in_progress', { sequence: 2, owner: 'bob' });
        expect(updated).toBe(true);
        expect(state.planTodos[0].status).toEqual('in_progress');
        expect(state.planTodos[0].owner).toEqual('bob');
        expect(state.planTodos[1].status).toEqual('pending');

        state.mergePlanStepStatus('plan-1', 'a', 'completed', { sequence: 3 });
        expect(state.planTodos[0].status).toEqual('completed');
    }

    @Test('mergePlanStepStatus sets blockedReason and appends to blockedBy when blocked')
    mergePlanStepStatusRecordsBlockedReason() {
        const state = this.createState();
        state.mergePlanCreated([{ id: 'a', content: 'setup', status: 'pending' }], 'plan-1', 1, 1);

        state.mergePlanStepStatus('plan-1', 'a', 'pending', { sequence: 2, reason: 'awaiting approval' });
        expect(state.planTodos[0].blockedReason).toEqual('awaiting approval');
        expect(state.planTodos[0].blockedBy).toContain('a');
    }

    @Test('mergePlanStepStatus drops stale events by sequence')
    mergePlanStepStatusDropsStaleBySequence() {
        const state = this.createState();
        state.mergePlanCreated([{ id: 'a', content: 'setup', status: 'pending' }], 'plan-1', 1, 5);
        state.mergePlanStepStatus('plan-1', 'a', 'in_progress', { sequence: 7 });

        state.mergePlanStepStatus('plan-1', 'a', 'completed', { sequence: 6 });
        expect(state.planTodos[0].status).toEqual('in_progress');
    }

    @Test('mergePlanStepStatus is ignored for a different planId')
    mergePlanStepStatusIgnoredForOtherPlan() {
        const state = this.createState();
        state.mergePlanCreated([{ id: 'a', content: 'setup', status: 'pending' }], 'plan-1', 1, 1);

        const updated = state.mergePlanStepStatus('other-plan', 'a', 'completed', { sequence: 2 });
        expect(updated).toBe(false);
        expect(state.planTodos[0].status).toEqual('pending');
    }

    @Test('mergePlanStepStatus is ignored for an unknown stepId')
    mergePlanStepStatusIgnoredForUnknownStep() {
        const state = this.createState();
        state.mergePlanCreated([{ id: 'a', content: 'setup', status: 'pending' }], 'plan-1', 1, 1);

        const updated = state.mergePlanStepStatus('plan-1', 'ghost', 'completed', { sequence: 2 });
        expect(updated).toBe(false);
    }

    @Test('layer-2 step tree exposes dependencies, estimate, owner and evidence in the plan message')
    layerTwoStepTreeExposesDependenciesAndEvidence() {
        const state = this.createState();
        state.mergePlanCreated([
            { id: 'a', content: 'setup', status: 'completed', owner: 'bob', estimate: '5m', evidenceIds: ['ev-1', 'ev-2'] },
            { id: 'b', content: 'build', status: 'in_progress', parentId: 'a', dependsOn: ['a'], owner: 'eve' }
        ], 'plan-1', 1, 1);

        const content = state.displayMessages.find(m => m.id === '__plan_todo_inline__')?.content || '';
        expect(content).toContain('needs a');
        expect(content).toContain('(eve)');
        expect(content).toContain('~5m');
        expect(content).toContain('evidence[2]');
    }

    @Test('layer-3 inspector surfaces evidence, receipt, diff, test and review details')
    layerThreeInspectorSurfacesEvidenceBlock() {
        const state = this.createState();
        state.mergePlanCreated([
            { id: 'a', content: 'setup', status: 'failed' }
        ], 'plan-1', 1, 1);
        state.planTodos[0] = {
            ...state.planTodos[0],
            status: 'failed',
            evidenceIds: ['ev-1'],
            receiptId: 'receipt-9',
            testSummary: '12 passed, 0 failed',
            diffSummary: '3 files changed',
            reviewSummary: 'approved',
            error: 'boom'
        };
        state.movePlanTodoSelection(1);

        const detail = state.selectedPlanTodoDetailLabel;
        expect(detail).toContain('evidence ev-1');
        expect(detail).toContain('receipt receipt-9');
        expect(detail).toContain('test: 12 passed, 0 failed');
        expect(detail).toContain('diff: 3 files changed');
        expect(detail).toContain('review: approved');
        expect(detail).toContain('error: boom');
    }

    @Test('setPlanTodos stamps planId and revision onto todos')
    setPlanTodosStampsPlanIdentity() {
        const state = this.createState();
        state.setPlanTodos(
            [{ id: 'a', content: 'setup', status: 'pending' }] as any,
            undefined,
            undefined,
            3,
            4,
            'plan-9'
        );
        expect(state.planTodos[0]).toMatchObject({ planId: 'plan-9', revision: 4 });
        expect(state.planThreadKey).toEqual('plan-9#r4');
    }

    @Test('cancelRemainingPlanSteps cancels all pending and in-progress steps in one bulk call')
    cancelRemainingPlanStepsCancelsAllOpen() {
        const state = this.createState();
        state.mergePlanCreated([
            { id: 'a', content: 'setup', status: 'pending' },
            { id: 'b', content: 'build', status: 'in_progress' },
            { id: 'c', content: 'ship', status: 'completed' }
        ], 'plan-1', 1, 1);

        state.cancelRemainingPlanSteps('plan-1', 9);
        expect(state.planTodos.map(t => t.status)).toEqual(['cancelled', 'cancelled', 'completed']);
    }

    @Test('cancelRemainingPlanSteps is a no-op for a stale sequence')
    cancelRemainingPlanStepsDropsStaleSequence() {
        const state = this.createState();
        state.mergePlanCreated([
            { id: 'a', content: 'setup', status: 'in_progress' }
        ], 'plan-1', 1, 5);

        state.cancelRemainingPlanSteps('plan-1', 4);
        expect(state.planTodos[0].status).toEqual('in_progress');
    }
}
