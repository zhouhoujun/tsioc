import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { QuestionStore } from '../src/app-rpc/QuestionStore';
import { SessionHandler } from '../src/api/SessionHandler';
import { SessionOwnerStore } from '../src/auth/SessionOwnerStore';
import { setRequestAuth } from '../src/auth/AuthMiddleware';

@Suite('gateway QuestionStore (P234)')
export class QuestionStoreTest {
    @Test('registers outstanding questions and lists them per session')
    async registersAndListsQuestions() {
        const store = new QuestionStore();
        store.register({ questionId: 'q1', sessionId: 's1', question: 'First?', options: ['a'], severity: 'medium' });
        store.register({ questionId: 'q2', sessionId: 's1', question: 'Second?', options: ['b'], severity: 'high' });
        store.register({ questionId: 'q1', sessionId: 's2', question: 'Other?', options: ['c'], severity: 'low' });

        const s1 = store.list('s1');
        expect(s1.length).toEqual(2);
        expect(s1[0].questionId).toEqual('q1');
        expect(s1[1].questionId).toEqual('q2');
        expect(s1.every(item => item.status === 'pending')).toEqual(true);

        const s2 = store.list('s2');
        expect(s2.length).toEqual(1);
        expect(s2[0].questionId).toEqual('q1');
        expect(s2[0].question).toEqual('Other?');

        expect(store.listPending('s1').length).toEqual(2);
    }

    @Test('answers a pending question once and dedups later answers')
    async answersOnceAndDedups() {
        const store = new QuestionStore();
        store.register({ questionId: 'q1', sessionId: 's1', question: 'Pick?', options: ['a', 'b'], severity: 'medium' });
        const first = store.answer('q1', 's1', 'a');
        expect(first.duplicate).toEqual(false);
        expect(first.expired).toEqual(false);
        expect(first.result.status).toEqual('answered');
        expect(first.result.answer).toEqual('a');

        const second = store.answer('q1', 's1', 'b');
        expect(second.duplicate).toEqual(true);
        expect(second.result.status).toEqual('answered');
        expect(second.result.answer).toEqual('a');
    }

    @Test('dismisses a pending question and dedups later dismissal')
    async dismissesAndDedups() {
        const store = new QuestionStore();
        store.register({ questionId: 'q1', sessionId: 's1', question: 'Pick?', options: [], severity: 'medium' });
        const first = store.dismiss('q1', 's1');
        expect(first.duplicate).toEqual(false);
        expect(first.result.status).toEqual('dismissed');
        expect(store.listPending('s1').length).toEqual(0);

        const second = store.dismiss('q1', 's1');
        expect(second.duplicate).toEqual(true);
    }

    @Test('rejects late answers to an expired question')
    async rejectsLateAnswerToExpired() {
        const store = new QuestionStore();
        store.register({ questionId: 'q1', sessionId: 's1', question: 'Pick?', options: ['a'], severity: 'medium', createdAt: 1, timeoutMs: 1 });
        const expired = store.answer('q1', 's1', 'a');
        expect(expired.expired).toEqual(true);
        expect(expired.result.status).toEqual('expired');
    }

    @Test('does not register a brand-new question if one with the same id is already pending')
    async keepsFirstPendingForSameId() {
        const store = new QuestionStore();
        const first = store.register({ questionId: 'q1', sessionId: 's1', question: 'First', options: ['a'], severity: 'medium' });
        const second = store.register({ questionId: 'q1', sessionId: 's1', question: 'First revised', options: ['b'], severity: 'high' });
        expect(second).toBe(first);
        expect(second.question).toEqual('First');
    }

    @Test('clears all questions for a session')
    async clearsSession() {
        const store = new QuestionStore();
        store.register({ questionId: 'q1', sessionId: 's1', question: 'One', options: [], severity: 'medium' });
        store.register({ questionId: 'q2', sessionId: 's1', question: 'Two', options: [], severity: 'medium' });
        store.register({ questionId: 'q3', sessionId: 's2', question: 'Three', options: [], severity: 'medium' });
        const removed = store.clearSession('s1');
        expect(removed).toEqual(2);
        expect(store.list('s1').length).toEqual(0);
        expect(store.list('s2').length).toEqual(1);
    }

    @Test('list lazily expires stale pending questions before surfacing them')
    async listLazilyExpiresStalePending() {
        const store = new QuestionStore();
        store.register({ questionId: 'q1', sessionId: 's1', question: 'Old?', options: ['a'], severity: 'medium', createdAt: Date.now() - 60_000, timeoutMs: 1_000 });
        store.register({ questionId: 'q2', sessionId: 's1', question: 'Fresh?', options: ['b'], severity: 'medium' });

        const listed = store.list('s1');
        expect(listed.find(item => item.questionId === 'q1')?.status).toEqual('expired');
        expect(listed.find(item => item.questionId === 'q2')?.status).toEqual('pending');
        expect(store.listPending('s1').map(item => item.questionId)).toEqual(['q2']);
        store.register({ questionId: 'q3', sessionId: 's2', question: 'Other', options: [], severity: 'medium', createdAt: Date.now() - 60_000, timeoutMs: 1_000 });
        expect(store.list('s2')[0].status).toEqual('expired');
    }

    @Test('SessionHandler.onTurnStarted clears the session pending-question store')
    async onTurnStartedClearsQuestions() {
        const store = new QuestionStore();
        store.register({ questionId: 'q1', sessionId: 's1', question: 'One', options: [], severity: 'medium' });
        const sessions = { has: async () => false, get: async () => ({ messages: [] }), setOwner: async () => {}, delete: async () => {} } as any;
        const owners = new SessionOwnerStore(sessions);
        const handler = new SessionHandler({ getMessages: async () => [] } as any, sessions, owners, undefined, store);

        handler.onTurnStarted({ sessionId: 's1' } as any);
        expect(store.list('s1').length).toEqual(0);
    }

    @Test('SessionHandler deleteSession route clears the session pending-question store')
    async deleteSessionRouteClearsQuestions() {
        const store = new QuestionStore();
        const records = new Map<string, any>();
        records.set('s1', { id: 's1', messages: [] });
        const sessions = {
            async has(id: string) { return records.has(id); },
            async get(id: string) { return records.get(id); },
            async setOwner(id: string, owner?: string) { const value = records.get(id); if (value) { value.ownerPrincipalId = owner; } },
            async delete(id: string) { records.delete(id); }
        } as any;
        store.register({ questionId: 'q1', sessionId: 's1', question: 'One', options: [], severity: 'medium' });
        const owners = new SessionOwnerStore(sessions);
        await owners.create('s1', 'user-1');
        const handler = new SessionHandler({ getMessages: async () => [] } as any, sessions, owners, undefined, store);

        const route = handler.getRoutes().find(route => route.path === '/api/sessions/:id' && route.method === 'DELETE')!;
        const req = {} as any;
        setRequestAuth(req, { token: 'token-1', principalId: 'user-1' });
        const res = {
            writeHead: () => res,
            end: () => res
        } as any;

        await route.handler(req, res, { id: 's1' });
        expect(store.list('s1').length).toEqual(0);
        expect(records.has('s1')).toEqual(false);
    }
}
