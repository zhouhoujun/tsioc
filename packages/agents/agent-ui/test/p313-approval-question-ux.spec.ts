import { navigationFor } from './test-transcript-navigation';
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
        // Decisions are rendered as keyed option rows (a/A/d); the hint only
        // lists the secondary keys instead of repeating each decision.
        expect(panel.allowOnceLabel).toEqual('Allow once');
        expect(panel.allowAlwaysLabel).toContain('Always allow');
        expect(panel.denyLabel).toEqual('Deny');
        expect(panel.approvalActionsLabel).toContain('↑↓ Move');
        expect(panel.approvalActionsLabel).toContain('Esc Deny');
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
        const options = { isClosed: false, onExit: () => {}, hasActiveTextPrompt: false,
                transcriptNavigationController: navigationFor(state) };
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
        const options = { isClosed: false, onExit: () => {}, hasActiveTextPrompt: false,
                transcriptNavigationController: navigationFor(state) };
        await state.processDecodedInput({ text: '2' }, {} as any, options);
        expect(state.pendingQuestionSelectedIndex).toEqual(1);
    }

    @Test('answering a question does not await the resumed turn')
    async pendingQuestionAnswerDoesNotBlockInput() {
        const state = makeState();
        state.questionAction = async () => undefined;
        let releaseTurn!: () => void;
        state.submitAction = () => new Promise<void>(resolve => { releaseTurn = resolve; });
        state.setPendingQuestion({
            questionId: 'q1', sessionId: state.sessionId, question: 'Pick',
            options: ['alpha', 'beta'], severity: 'medium', createdAt: 1, updatedAt: 1, status: 'pending'
        });
        state.setInput('custom');
        // The input dispatch chain awaits submitPendingQuestionInput; if it
        // waited for the resumed turn, approval keys would queue behind a
        // prompt raised by that turn (real TUI: 30s approval timeout).
        const outcome = await Promise.race([
            state.submitPendingQuestionInput().then(() => 'answered'),
            new Promise(resolve => setTimeout(() => resolve('blocked'), 120))
        ]);
        expect(outcome).toEqual('answered');
        expect(state.pendingQuestion).toEqual(null);
        releaseTurn();
    }

    @Test('a grouped TUI text run becomes a custom question answer')
    async pendingQuestionGroupedTextRun() {
        const state = makeState();
        const calls: any[] = [];
        state.questionAction = async input => { calls.push(input); };
        state.setPendingQuestion({
            questionId: 'q1', sessionId: state.sessionId, question: 'Pick',
            options: ['alpha', 'beta'], severity: 'medium', createdAt: 1, updatedAt: 1, status: 'pending'
        });
        const options = { isClosed: false, onExit: () => {}, hasActiveTextPrompt: false,
                transcriptNavigationController: navigationFor(state) };
        // A fast keystroke burst/paste arrives as one decoded text run, not one
        // character at a time.
        await state.processDecodedInput({ text: 'gamma' }, {} as any, options);
        expect(state.input).toEqual('gamma');
        expect(state.pendingQuestionSelectedIndex).toEqual(0);

        await state.processDecodedInput({ text: '2' }, {} as any, options);
        expect(state.input).toEqual('gamma2');
        await state.processDecodedInput({ text: '', controlKey: 'return' }, {} as any, options);
        expect(calls).toEqual([{
            questionId: 'q1', sessionId: state.sessionId, action: 'answer', answer: 'gamma2'
        }]);
    }
}
