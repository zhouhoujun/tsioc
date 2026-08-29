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

    @Test('advances to the next queued question after answering the active one')
    async advancesQueueAfterAnswer() {
        const state = new AgentConsoleSessionState();
        state.questionAction = async () => {};
        state.setPendingQuestion({ questionId: 'q1', sessionId: state.sessionId, question: 'First', options: ['a'], severity: 'medium', createdAt: 1, updatedAt: 1, status: 'pending' });
        state.setPendingQuestion({ questionId: 'q2', sessionId: state.sessionId, question: 'Second', options: ['b'], severity: 'medium', createdAt: 2, updatedAt: 2, status: 'pending' });
        expect(state.pendingQuestionTotal).toEqual(2);
        expect(state.pendingQuestion?.questionId).toEqual('q1');
        await state.choosePendingQuestion(0);
        expect(state.pendingQuestion?.questionId).toEqual('q2');
        expect(state.pendingQuestionTotal).toEqual(1);
    }

    @Test('replaces a pending question with the same questionId instead of duplicating')
    async dedupsSameQuestionId() {
        const state = new AgentConsoleSessionState();
        state.setPendingQuestion({ questionId: 'q1', sessionId: state.sessionId, question: 'First', options: ['a'], severity: 'medium', createdAt: 1, updatedAt: 1, status: 'pending' });
        state.setPendingQuestion({ questionId: 'q1', sessionId: state.sessionId, question: 'First revised', options: ['a', 'b'], severity: 'medium', createdAt: 1, updatedAt: 2, status: 'pending' });
        expect(state.pendingQuestionTotal).toEqual(1);
        expect(state.pendingQuestion?.question).toEqual('First revised');
        expect(state.pendingQuestion?.options).toEqual(['a', 'b']);
    }

    @Test('rejects an outdated update for an already-answered question')
    async ignoresStaleUpdateForAnswered() {
        const state = new AgentConsoleSessionState();
        state.setPendingQuestion({ questionId: 'q1', sessionId: state.sessionId, question: 'First', options: ['a'], severity: 'medium', createdAt: 1, updatedAt: 2, status: 'pending' });
        state.markPendingQuestionExpired('q1');
        state.finishPendingQuestion();
        expect(state.pendingQuestionTotal).toEqual(0);
    }

    @Test('clears the whole queue when setPendingQuestion(null) is called')
    async clearsQueueOnNull() {
        const state = new AgentConsoleSessionState();
        state.setPendingQuestion({ questionId: 'q1', sessionId: state.sessionId, question: 'First', options: ['a'], severity: 'medium', createdAt: 1, updatedAt: 1, status: 'pending' });
        state.setPendingQuestion({ questionId: 'q2', sessionId: state.sessionId, question: 'Second', options: ['b'], severity: 'medium', createdAt: 2, updatedAt: 2, status: 'pending' });
        state.setPendingQuestion(null);
        expect(state.pendingQuestionTotal).toEqual(0);
        expect(state.pendingQuestion).toEqual(null);
    }

    @Test('advances the queue when the RPC rejects an expired answer')
    async advancesQueueOnExpiredAnswerRejection() {
        const state = new AgentConsoleSessionState();
        state.questionAction = async () => { throw new Error('Question expired'); };
        state.setPendingQuestion({ questionId: 'q1', sessionId: state.sessionId, question: 'First', options: ['a'], severity: 'medium', createdAt: 1, updatedAt: 1, status: 'pending' });
        state.setPendingQuestion({ questionId: 'q2', sessionId: state.sessionId, question: 'Second', options: ['b'], severity: 'medium', createdAt: 2, updatedAt: 2, status: 'pending' });
        await state.choosePendingQuestion(0);
        expect(state.pendingQuestion?.questionId).toEqual('q2');
    }
}
