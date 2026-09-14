import { InMemoryCommandExecutionControl } from "@tsdi/agent";
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState } from '../src';
import { AgentConsoleRemoteEventBridge } from '../src';

class ExposedBridge extends AgentConsoleRemoteEventBridge {
    public async runSeed(): Promise<void> {
        this.sessionId = this.state.sessionId;
        await this.seedFromQuestions();
    }
}

function makeState(): AgentConsoleSessionState {
    return new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
}

@Suite('pending question lifecycle (P234)')
export class PendingQuestionLifecycleTest {
    @Test('submits a selected answer once and clears only after success')
    async submitsAnswerAndPreventsDuplicateSubmission() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        const calls: any[] = [];
        state.questionAction = async input => { calls.push(input); };
        state.setPendingQuestion({ questionId: 'q1', sessionId: state.sessionId, question: 'Pick', options: ['one'], severity: 'medium', createdAt: 1, updatedAt: 1, status: 'pending' });
        expect(await state.choosePendingQuestion()).toEqual(true);
        expect(calls).toEqual([{ questionId: 'q1', sessionId: state.sessionId, action: 'answer', answer: 'one' }]);
        expect(state.pendingQuestion).toEqual(null);
    }

    @Test('keeps the question and draft when submission is rejected')
    async retainsDraftOnSubmissionFailure() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.questionAction = async () => { throw new Error('offline'); };
        state.setPendingQuestion({ questionId: 'q1', sessionId: state.sessionId, question: 'Pick', options: ['one'], severity: 'medium', createdAt: 1, updatedAt: 1, status: 'pending' });
        await state.choosePendingQuestion();
        expect(state.pendingQuestion?.status).toEqual('pending');
        expect(state.pendingQuestion?.error).toEqual('offline');
        expect(state.input).toEqual('one');
    }

    @Test('advances to the next queued question after answering the active one')
    async advancesQueueAfterAnswer() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
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
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setPendingQuestion({ questionId: 'q1', sessionId: state.sessionId, question: 'First', options: ['a'], severity: 'medium', createdAt: 1, updatedAt: 1, status: 'pending' });
        state.setPendingQuestion({ questionId: 'q1', sessionId: state.sessionId, question: 'First revised', options: ['a', 'b'], severity: 'medium', createdAt: 1, updatedAt: 2, status: 'pending' });
        expect(state.pendingQuestionTotal).toEqual(1);
        expect(state.pendingQuestion?.question).toEqual('First revised');
        expect(state.pendingQuestion?.options).toEqual(['a', 'b']);
    }

    @Test('rejects an outdated update for an already-answered question')
    async ignoresStaleUpdateForAnswered() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setPendingQuestion({ questionId: 'q1', sessionId: state.sessionId, question: 'First', options: ['a'], severity: 'medium', createdAt: 1, updatedAt: 2, status: 'pending' });
        state.markPendingQuestionExpired('q1');
        state.finishPendingQuestion();
        expect(state.pendingQuestionTotal).toEqual(0);
    }

    @Test('clears the whole queue when setPendingQuestion(null) is called')
    async clearsQueueOnNull() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setPendingQuestion({ questionId: 'q1', sessionId: state.sessionId, question: 'First', options: ['a'], severity: 'medium', createdAt: 1, updatedAt: 1, status: 'pending' });
        state.setPendingQuestion({ questionId: 'q2', sessionId: state.sessionId, question: 'Second', options: ['b'], severity: 'medium', createdAt: 2, updatedAt: 2, status: 'pending' });
        state.setPendingQuestion(null);
        expect(state.pendingQuestionTotal).toEqual(0);
        expect(state.pendingQuestion).toEqual(null);
    }

    @Test('advances the queue when the RPC rejects an expired answer')
    async advancesQueueOnExpiredAnswerRejection() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.questionAction = async () => { throw new Error('Question expired'); };
        state.setPendingQuestion({ questionId: 'q1', sessionId: state.sessionId, question: 'First', options: ['a'], severity: 'medium', createdAt: 1, updatedAt: 1, status: 'pending' });
        state.setPendingQuestion({ questionId: 'q2', sessionId: state.sessionId, question: 'Second', options: ['b'], severity: 'medium', createdAt: 2, updatedAt: 2, status: 'pending' });
        await state.choosePendingQuestion(0);
        expect(state.pendingQuestion?.questionId).toEqual('q2');
    }

    @Test('preserves expiresAt through setPendingQuestion')
    async preservesExpiresAt() {
        const state = makeState();
        state.setPendingQuestion({ questionId: 'q-exp', sessionId: state.sessionId, question: 'Expiry?', options: ['yes'], severity: 'low', createdAt: 1, updatedAt: 1, status: 'pending', expiresAt: 9_000_000_000 });
        expect(state.pendingQuestion?.expiresAt).toEqual(9_000_000_000);
    }

    @Test('advances queue immediately when expiresAt is in the past')
    async advancesQueueOnLocalExpiry() {
        const state = makeState();
        const rpcCalls: any[] = [];
        state.questionAction = async (input: any) => { rpcCalls.push(input); };
        state.setPendingQuestion({ questionId: 'q1', sessionId: state.sessionId, question: 'Expired?', options: ['a'], severity: 'medium', createdAt: 1, updatedAt: 1, status: 'pending', expiresAt: Date.now() - 5000 });
        state.setPendingQuestion({ questionId: 'q2', sessionId: state.sessionId, question: 'Live?', options: ['b'], severity: 'medium', createdAt: 2, updatedAt: 2, status: 'pending', expiresAt: Date.now() + 60_000 });
        expect(state.pendingQuestionTotal).toEqual(2);
        await state.choosePendingQuestion(0);
        expect(rpcCalls.length).toEqual(0);
        expect(state.pendingQuestion?.questionId).toEqual('q2');
        expect(state.pendingQuestionTotal).toEqual(1);
    }

    @Test('seedFromQuestions drops expired items during initial seed')
    async seedFromQuestionsDropsExpired() {
        const state = makeState();
        state.sessionId = 's1';
        const expiredQuestion = { questionId: 'q-old', sessionId: 's1', question: 'Old?', options: ['a'], status: 'pending', expiresAt: Date.now() - 1000, createdAt: 1, updatedAt: 1 };
        const liveQuestion = { questionId: 'q-new', sessionId: 's1', question: 'New?', options: ['b'], status: 'pending', expiresAt: Date.now() + 60_000, createdAt: 2, updatedAt: 2 };
        const rpc = { request: async (method: string) => method === 'question.list' ? [expiredQuestion, liveQuestion] : [] } as any;
        const bridge = new ExposedBridge(state, { baseUrl: 'http://localhost', rpc });
        await bridge.runSeed();
        expect(state.pendingQuestionTotal).toEqual(1);
        expect(state.pendingQuestion?.questionId).toEqual('q-new');
    }
}