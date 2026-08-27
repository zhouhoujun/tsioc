import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState } from '../src/AgentConsoleSessionState';

@Suite('P230 plan interaction action model')
export class PlanActionSuite {
    protected createState(): AgentConsoleSessionState {
        return new AgentConsoleSessionState();
    }

    @Test('requestPlanAction for a destructive action opens a confirmation prompt and does not apply yet')
    requestPlanActionOpensConfirmation() {
        const state = this.createState();
        state.mergePlanCreated([{ id: 'a', content: 'setup', status: 'pending' }], 'plan-1', 1, 1);

        const accepted = state.requestPlanAction('complete', 'a');
        expect(accepted).toBe(true);
        expect(state.planActionPrompt).toMatchObject({ action: 'complete', stepId: 'a', confirmLabel: 'Complete' });
        expect(state.planTodos[0].status).toEqual('pending');
    }

    @Test('requestPlanAction rejects an action that is not applicable to the item')
    requestPlanActionRejectsInapplicable() {
        const state = this.createState();
        state.mergePlanCreated([{ id: 'a', content: 'setup', status: 'completed' }], 'plan-1', 1, 1);
        const state2 = this.createState();
        state2.mergePlanCreated([{ id: 'b', content: 'build', status: 'pending' }], 'plan-1', 1, 1);

        expect(state.requestPlanAction('complete', 'a')).toBe(false);
        expect(state2.requestPlanAction('retry', 'b')).toBe(false);
        expect(state.planActionPrompt).toBeNull();
        expect(state2.planActionPrompt).toBeNull();
    }

    @Test('retry applies optimistically and dispatches immediately without a confirmation prompt')
    retryActionAppliesImmediately() {
        const state = this.createState();
        state.mergePlanCreated([{ id: 'a', content: 'setup', status: 'failed', error: 'boom' }], 'plan-1', 1, 1);

        const accepted = state.requestPlanAction('retry', 'a');
        expect(accepted).toBe(true);
        expect(state.planActionPrompt).toBeNull();
        expect(state.planTodos[0].status).toEqual('pending');
        expect(state.planTodos[0].error).toBeUndefined();
        expect(state.planActionApplying).toBe(true);
    }

    @Test('confirmPlanAction applies optimistically and returns true')
    confirmPlanActionApplies() {
        const state = this.createState();
        state.mergePlanCreated([{ id: 'a', content: 'setup', status: 'pending' }], 'plan-1', 1, 1);

        state.requestPlanAction('complete', 'a');
        const confirmed = state.confirmPlanAction();
        expect(confirmed).toBe(true);
        expect(state.planActionPrompt).toBeNull();
        expect(state.planTodos[0].status).toEqual('completed');
    }

    @Test('confirmPlanAction rolls back the optimistic apply when the action bus denies permission')
    confirmPlanActionRollsBackOnDenial() {
        const state = this.createState();
        state.mergePlanCreated([{ id: 'a', content: 'setup', status: 'pending' }], 'plan-1', 1, 1);
        state.planActionBus = async () => false;

        state.requestPlanAction('complete', 'a');
        state.confirmPlanAction();
        return (async () => {
            await new Promise(resolve => setImmediate(resolve));
            expect(state.planTodos[0].status).toEqual('pending');
            expect(state.planActionApplying).toBe(false);
        })();
    }

    @Test('confirmPlanAction rolls back the optimistic apply when the action bus throws')
    confirmPlanActionRollsBackOnError() {
        const state = this.createState();
        state.mergePlanCreated([{ id: 'a', content: 'setup', status: 'pending' }], 'plan-1', 1, 1);
        state.planActionBus = async () => { throw new Error('rpc down'); };

        state.requestPlanAction('complete', 'a');
        state.confirmPlanAction();
        return (async () => {
            await new Promise(resolve => setImmediate(resolve));
            expect(state.planTodos[0].status).toEqual('pending');
            expect(state.planActionApplying).toBe(false);
        })();
    }

    @Test('dismissPlanAction clears the prompt without applying the change')
    dismissPlanActionClearsPrompt() {
        const state = this.createState();
        state.mergePlanCreated([{ id: 'a', content: 'setup', status: 'pending' }], 'plan-1', 1, 1);

        state.requestPlanAction('block', 'a', { reason: 'needs review' });
        state.dismissPlanAction();
        expect(state.planActionPrompt).toBeNull();
        expect(state.planTodos[0].blockedBy).toBeUndefined();
        expect(state.planTodos[0].blockedReason).toBeUndefined();
    }

    @Test('retry falls back to the composer retry action when no action bus is wired')
    retryFallsBackToComposerFallback() {
        const state = this.createState();
        state.mergePlanCreated([{ id: 'a', content: 'setup', status: 'failed', error: 'boom' }], 'plan-1', 1, 1);
        let invoked: string | null = null;
        state.retrySelectedPlanTodoAction = async (todo) => { invoked = todo.id; };

        state.requestPlanAction('retry', 'a');
        return (async () => {
            await new Promise(resolve => setImmediate(resolve));
            expect(invoked).toEqual('a');
            expect(state.planTodos[0].status).toEqual('pending');
            expect(state.planActionApplying).toBe(false);
        })();
    }

    @Test('block sets blockedBy/blockedReason and unblock clears them through the action model')
    blockAndUnblockRoundTrip() {
        const state = this.createState();
        state.mergePlanCreated([{ id: 'a', content: 'setup', status: 'pending' }], 'plan-1', 1, 1);

        state.requestPlanAction('block', 'a', { reason: 'needs approval' });
        state.confirmPlanAction();
        const blocked = state.planTodos[0];
        expect(blocked.blockedReason).toEqual('needs approval');
        expect(blocked.blockedBy).toContain('a');

        state.requestPlanAction('unblock', 'a');
        expect(state.planActionPrompt).toMatchObject({ action: 'unblock', stepId: 'a' });
        state.confirmPlanAction();
        expect(state.planTodos[0].blockedBy).toBeUndefined();
        expect(state.planTodos[0].blockedReason).toBeUndefined();
    }

    @Test('assign sets the owner from the payload through confirmation')
    assignSetsOwner() {
        const state = this.createState();
        state.mergePlanCreated([{ id: 'a', content: 'setup', status: 'pending' }], 'plan-1', 1, 1);

        state.requestPlanAction('assign', 'a', { owner: 'alice' });
        state.confirmPlanAction();
        expect(state.planTodos[0].owner).toEqual('alice');
    }

    @Test('block is not applicable when the item is already blocked (idempotency guard)')
    blockIdempotencyGuard() {
        const state = this.createState();
        state.mergePlanCreated([{ id: 'a', content: 'setup', status: 'pending' }], 'plan-1', 1, 1);
        state.requestPlanAction('block', 'a', { reason: 'x' });
        state.confirmPlanAction();

        expect(state.isPlanActionApplicable('block', state.planTodos[0])).toBe(false);
        expect(state.requestPlanAction('block', 'a')).toBe(false);
    }

    @Test('rollbackPlanAction restores the previous snapshot of the step')
    rollbackPlanActionRestoresSnapshot() {
        const state = this.createState();
        state.mergePlanCreated([{ id: 'a', content: 'setup', status: 'pending' }], 'plan-1', 1, 1);
        const previous = state.planTodos[0];
        state.planTodos = state.planTodos.map(todo => ({ ...todo, status: 'completed' }));
        state.rollbackPlanAction('a', previous);
        expect(state.planTodos[0].status).toEqual('pending');
    }
}
