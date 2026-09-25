import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { ToolEvidenceEntry } from '@tsdi/agent';
import { TodoItem, TodoPlanSnapshot } from '../planning/todo-store';
import {
    reconcileStepStatus,
    buildStepSummary,
    renderStepSummary,
    ReconcileStepInput,
    StepExecutionSummary
} from '../planning/step-reconciler';

function item(id: string, overrides: Partial<TodoItem> = {}): TodoItem {
    return { id, content: `${id} content`, status: 'pending', ...overrides };
}

function plan(...todos: TodoItem[]): TodoPlanSnapshot {
    return { planId: 'plan-1', revision: 1, todos };
}

function ev(id: string, overrides: Partial<ToolEvidenceEntry> = {}): ToolEvidenceEntry {
    return {
        id,
        turnId: 't1',
        sessionId: 's1',
        toolName: 'write_file',
        status: 'success',
        createdAt: 1,
        ...overrides
    };
}

function reconcile(input: Partial<ReconcileStepInput> & { plan: TodoPlanSnapshot; evidence: ToolEvidenceEntry[] }) {
    return reconcileStepStatus({ ...input } as ReconcileStepInput);
}

// `updatedAt` is wall-clock, so comparing it raw races the millisecond boundary.
function replayShape(result: ReturnType<typeof reconcileStepStatus>): string {
    return JSON.stringify({
        outcomes: result.outcomes,
        updatedTodos: result.updatedTodos.map(todo => ({ ...todo, updatedAt: undefined }))
    });
}

@Suite('plan execution reconciler (P227)')
export class StepReconcilerTest {

    @Test('completes a step when acceptance-satisfying evidence is present')
    completeOnAcceptance() {
        const r = reconcile({
            plan: plan(item('a', { status: 'in_progress', acceptance: 'test passes' })),
            evidence: [ev('e1', { stepId: 'a', toolName: 'test', status: 'success' })]
        });
        const outcome = r.outcomes[0];
        expect(outcome.transition).toBe('completed');
        expect(outcome.evidenceStatus).toBe('satisfied');
        expect(r.updatedTodos[0].status).toBe('completed');
    }

    @Test('does not complete when evidence is unrelated to the step')
    unrelatedEvidenceLeavesStepUntouched() {
        const r = reconcile({
            plan: plan(item('a', { status: 'in_progress' })),
            evidence: [ev('e1', { stepId: 'b', toolName: 'test', status: 'success' })]
        });
        expect(r.outcomes[0].transition).toBe('none');
        expect(r.outcomes[0].evidenceStatus).toBe('none');
        expect(r.updatedTodos[0].status).toBe('in_progress');
    }

    @Test('falls back to the in-progress step when evidence has no stepId')
    fallbackToInProgressStep() {
        const r = reconcile({
            plan: plan(item('a', { status: 'in_progress' })),
            evidence: [ev('e1', { toolName: 'test', status: 'success' })],
            inProgressStepId: 'a'
        });
        expect(r.outcomes[0].transition).toBe('completed');
        expect(r.outcomes[0].evidenceStatus).toBe('satisfied');
    }

    @Test('attributes parallel tool evidence to distinct steps by stepId')
    parallelToolsAttributedPerStep() {
        const r = reconcile({
            plan: plan(
                item('a', { status: 'in_progress' }),
                item('b', { status: 'in_progress' })
            ),
            evidence: [
                ev('e1', { stepId: 'a', toolName: 'test', status: 'success' }),
                ev('e2', { stepId: 'b', toolName: 'write_file', status: 'success' }),
                ev('e3', { stepId: 'b', toolName: 'verify-command', status: 'success', verification: 'verify-command' })
            ]
        });
        const byId = new Map(r.outcomes.map(o => [o.stepId, o]));
        expect(byId.get('a')!.transition).toBe('completed');
        expect(byId.get('b')!.transition).toBe('completed');
        expect(r.updatedTodos.every(t => t.status === 'completed')).toBe(true);
    }

    @Test('marks a step failed when its evidence is falsified and records cause and next action')
    falsifiedEvidenceFailsStep() {
        const r = reconcile({
            plan: plan(item('a', { status: 'in_progress' })),
            evidence: [ev('e1', { stepId: 'a', toolName: 'write_file', status: 'success', falsified: true, falsificationReason: 'LSP error: type mismatch' })]
        });
        const outcome = r.outcomes[0];
        expect(outcome.transition).toBe('failed');
        expect(outcome.evidenceStatus).toBe('falsified');
        expect(outcome.cause).toContain('LSP error');
        expect(outcome.nextAction).toBeTruthy();
        expect(r.updatedTodos[0].status).toBe('failed');
    }

    @Test('marks a step failed when its verification command exited non-zero')
    failingVerificationFailsStep() {
        const r = reconcile({
            plan: plan(item('a', { status: 'in_progress' })),
            evidence: [ev('e1', { stepId: 'a', toolName: 'verify-command', status: 'error', verification: 'verify-command', error: 'tsc exited 2' })]
        });
        expect(r.outcomes[0].transition).toBe('failed');
        expect(r.outcomes[0].evidenceStatus).toBe('falsified');
        expect(r.updatedTodos[0].status).toBe('failed');
    }

    @Test('blocks a gated step instead of failing it')
    gatedStepIsBlocked() {
        const r = reconcile({
            plan: plan(item('a', { status: 'in_progress', acceptance: 'test passes' })),
            evidence: [ev('e1', { stepId: 'a', toolName: 'write_file', status: 'success', falsified: true, falsificationReason: 'review findings' })],
            gatedStepIds: ['a']
        });
        expect(r.outcomes[0].transition).toBe('blocked');
        expect(r.updatedTodos[0].status).toBe('in_progress');
    }

    @Test('review rejected a completed step reverts it and records cause')
    reviewRejectionRevertsCompletedStep() {
        const r = reconcile({
            plan: plan(item('a', { status: 'completed' })),
            evidence: [],
            reviewRejectedStepIds: ['a']
        });
        const outcome = r.outcomes[0];
        expect(outcome.transition).toBe('failed');
        expect(outcome.cause).toContain('Review rejected');
        expect(r.updatedTodos[0].status).toBe('failed');
    }

    @Test('manual override is respected and never overwritten')
    manualOverrideIsRespected() {
        const r = reconcile({
            plan: plan(item('a', { status: 'in_progress' })),
            evidence: [ev('e1', { stepId: 'a', toolName: 'test', status: 'success' })],
            manualOverrides: { a: 'pending' }
        });
        expect(r.outcomes[0].overridden).toBe(true);
        expect(r.outcomes[0].transition).toBe('none');
        expect(r.updatedTodos[0].status).toBe('in_progress');
    }

    @Test('reconcile is replay-consistent: same inputs yield identical decisions')
    replayConsistency() {
        const input = {
            plan: plan(
                item('a', { status: 'in_progress' }),
                item('b', { status: 'in_progress' })
            ),
            evidence: [
                ev('e1', { stepId: 'a', toolName: 'test', status: 'success' }),
                ev('e2', { stepId: 'b', toolName: 'write_file', status: 'success', falsified: true, falsificationReason: 'LSP error' })
            ]
        } as ReconcileStepInput;
        const first = reconcileStepStatus(input);
        const second = reconcileStepStatus(input);
        expect(replayShape(first)).toBe(replayShape(second));
        expect(first.updatedTodos[0].status).toBe('completed');
        expect(first.updatedTodos[1].status).toBe('failed');
    }

    @Test('renders a step summary without the full todo text')
    renderSummaryIsCompact() {
        const r = reconcile({
            plan: plan(
                item('a', { status: 'in_progress' }),
                item('b', { status: 'in_progress' }),
                item('c', { status: 'pending' })
            ),
            evidence: [
                ev('e1', { stepId: 'a', toolName: 'test', status: 'success' }),
                ev('e2', { stepId: 'b', toolName: 'write_file', status: 'success', falsified: true, falsificationReason: 'LSP error: type mismatch' })
            ]
        });
        const summary: StepExecutionSummary = buildStepSummary(r);
        expect(summary.completed.length).toBe(1);
        expect(summary.failedOrBlocked.length).toBe(1);
        expect(summary.failedOrBlocked[0].nextAction).toBeTruthy();
        expect(summary.unresolved.length).toBe(1);
        expect(summary.unresolved[0].id).toBe('c');

        const text = renderStepSummary(summary);
        expect(text).toContain('Steps needing attention');
        expect(text).toContain('Remaining steps');
        expect(text).not.toContain('full');
    }
}
