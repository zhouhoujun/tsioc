import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState } from '../src';

@Suite('pending question lifecycle (P234)')
export class PendingQuestionLifecycleTest {
    @Test('submits a selected answer once and clears only after success')
    async submitsAnswerAndPreventsDuplicateSubmission() {
        const state = new AgentConsoleSessionState();
        const calls: any[] = [];
        state.questionAction = async input => { calls.push(input); };
        state.setPendingQuestion({ questionId: 'q1', sessionId: state.sessionId, question: 'Pick', options: ['one'], severity: 'medium', createdAt: 1, updatedAt: 1, status: 'pending' });
        expect(await state.choosePendingQuestion()).toEqual(true);
        expect(calls).toEqual([{ questionId: 'q1', sessionId: state.sessionId, action: 'answer', answer: 'one' }]);
        expect(state.pendingQuestion).toEqual(null);
    }

    @Test('keeps the question and draft when submission is rejected')
    async retainsDraftOnSubmissionFailure() {
        const state = new AgentConsoleSessionState();
        state.questionAction = async () => { throw new Error('offline'); };
        state.setPendingQuestion({ questionId: 'q1', sessionId: state.sessionId, question: 'Pick', options: ['one'], severity: 'medium', createdAt: 1, updatedAt: 1, status: 'pending' });
        await state.choosePendingQuestion();
        expect(state.pendingQuestion?.status).toEqual('pending');
        expect(state.pendingQuestion?.error).toEqual('offline');
        expect(state.input).toEqual('one');
    }
}
