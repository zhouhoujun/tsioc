import { InMemoryCommandExecutionControl } from "@tsdi/agent";
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    AgentConsoleApprovalsPanelComponent,
    AgentConsolePendingQuestionPanelComponent,
    AgentConsoleSessionState
} from '../src';

function makeState(): AgentConsoleSessionState {
    return new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
}

function approval(overrides: Record<string, any> = {}): any {
    return {
        id: 'approval-1',
        toolName: 'terminal',
        sessionId: 'console',
        reason: 'Shell execution requires approval.',
        summary: 'Shell execution requires approval.',
        hasInput: true,
        inputSummary: 'npm test',
        createdAt: 1,
        timeoutMs: 60000,
        expiresAt: Date.now() + 60000,
        ...overrides
    };
}

@Suite('approval and question interaction UX (P313)')
export class P313ApprovalQuestionUxTest {
    @Test('a new approval surfaces its prompt and moves focus off the composer')
    async approvalSurfacesPrompt() {
        const state = makeState();
        state.upsertPendingApproval(approval());
        state.requestApprovalAttention();
        expect(state.approvalsFocused).toEqual(true);
        expect(state.inputFocused).toEqual(false);
        expect(state.selectedApprovalId).toEqual('approval-1');
    }

    @Test('approval attention never steals focus from a pending question')
    async approvalAttentionYieldsToQuestion() {
        const state = makeState();
        state.setPendingQuestion({
            questionId: 'q1', sessionId: state.sessionId, question: 'Pick', options: ['one'],
            severity: 'medium', createdAt: 1, updatedAt: 1, status: 'pending'
        });
        state.upsertPendingApproval(approval());
        state.requestApprovalAttention();
        expect(state.approvalsFocused).toEqual(false);
    }

    @Test('approval panel renders allow question, command preview, reason, and actions')
    async approvalPanelPrompt() {
        const state = makeState();
        state.setPendingApprovals([approval({ id: 'approval-2' })]);
        state.setApprovalsFocused(true);
        state.setSelectedApprovalId('approval-2');
        const panel = new AgentConsoleApprovalsPanelComponent(state);
        expect(panel.approvalsTitleLabel).toContain('Allow terminal?');
        expect(panel.selectedApprovalRequestLabel).toEqual('$ npm test');
        expect(panel.selectedApprovalDetailLabel).toContain('Reason: Shell execution requires approval.');
        expect(panel.approvalActionsLabel).toContain('a Allow');
        expect(panel.approvalActionsLabel).toContain('d Deny');
    }

    @Test('question dialog states it awaits the user and offers a custom answer')
    async questionDialogCustomAnswer() {
        const state = makeState();
        const calls: any[] = [];
        state.questionAction = async input => { calls.push(input); };
        state.setPendingQuestion({
            questionId: 'q1', sessionId: state.sessionId, question: 'Pick', options: ['one'],
            severity: 'medium', createdAt: 1, updatedAt: 1, status: 'pending'
        });
        const panel = new AgentConsolePendingQuestionPanelComponent(state);
        expect(panel.pendingQuestionHeader).toContain('Awaiting your answer');
        expect(panel.pendingQuestionCustomHint).toContain('type your own answer');

        state.setInput('custom');
        expect(panel.pendingQuestionCustomHint).toContain('Custom answer: custom');
        expect(await state.submitPendingQuestionInput()).toEqual(true);
        expect(calls).toEqual([{
            questionId: 'q1', sessionId: state.sessionId, action: 'answer', answer: 'custom'
        }]);
        expect(state.pendingQuestion).toEqual(null);
    }

    @Test('typing builds a custom question answer, including digits, and submits it')
    async pendingQuestionTyping() {
        const state = makeState();
        const calls: any[] = [];
        state.questionAction = async input => { calls.push(input); };
        state.setPendingQuestion({
            questionId: 'q1', sessionId: state.sessionId, question: 'Pick',
            options: ['alpha', 'beta'], severity: 'medium', createdAt: 1, updatedAt: 1, status: 'pending'
        });
        const options = { isClosed: false, onExit: () => {}, hasActiveTextPrompt: false };
        await state.processDecodedInput({ text: 'x' }, {} as any, options);
        await state.processDecodedInput({ text: 'y' }, {} as any, options);
        expect(state.input).toEqual('xy');

        await state.processDecodedInput({ text: '2' }, {} as any, options);
        expect(state.input).toEqual('xy2');

        await state.processDecodedInput({ text: '', controlKey: 'backspace' }, {} as any, options);
        expect(state.input).toEqual('xy');

        await state.processDecodedInput({ text: '', controlKey: 'return' }, {} as any, options);
        expect(calls).toEqual([{
            questionId: 'q1', sessionId: state.sessionId, action: 'answer', answer: 'xy'
        }]);
        expect(state.pendingQuestion).toEqual(null);
    }

    @Test('an empty draft still lets a digit pick the numbered option')
    async pendingQuestionEmptyDraftDigitPicks() {
        const state = makeState();
        state.setPendingQuestion({
            questionId: 'q1', sessionId: state.sessionId, question: 'Pick',
            options: ['alpha', 'beta'], severity: 'medium', createdAt: 1, updatedAt: 1, status: 'pending'
        });
        const options = { isClosed: false, onExit: () => {}, hasActiveTextPrompt: false };
        await state.processDecodedInput({ text: '2' }, {} as any, options);
        expect(state.pendingQuestionSelectedIndex).toEqual(1);
    }
}
