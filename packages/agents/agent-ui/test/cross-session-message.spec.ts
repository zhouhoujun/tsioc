import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { handleMessage, resolveCrossSessionTarget } from '../src/AgentConsoleSessionCommandHandlers';

function buildCtx(options: { fail?: boolean } = {}) {
    const sent: Array<{ sessionId: string; text: string; wake?: boolean; fromSessionId?: string }> = [];
    const notices: string[] = [];
    const ctx: any = {
        translator: null,
        state: {
            sessionId: 's1',
            crossSessionMessages: true,
            sessions: [
                { id: 's1', title: 'Main' },
                { id: 'chat-alpha', title: 'Alpha' },
                { id: 'chat-alpine', title: 'Alpine' }
            ]
        },
        sessionService: {
            sendSessionMessage: async (sessionId: string, text: string, opts: any) => {
                if (options.fail) throw new Error('target locked');
                sent.push({ sessionId, text, ...opts });
                return { sessionId, woken: opts?.wake === true };
            }
        },
        notify: (message: string) => notices.push(message)
    };
    return { ctx, sent, notices };
}

@Suite('cross-session messaging command')
export class CrossSessionMessageCommandTest {
    @Test('resolves full ids and unique prefixes only')
    resolvesTargets() {
        const sessions = [{ id: 'chat-alpha' }, { id: 'chat-alpine' }, { id: 's1' }];
        expect(resolveCrossSessionTarget(sessions, 'chat-alpha')).toEqual('chat-alpha');
        expect(resolveCrossSessionTarget(sessions, 'chat-alp')).toBeUndefined();
        expect(resolveCrossSessionTarget(sessions, 's1')).toEqual('s1');
    }

    @Test('sends append-only by default with the sender id')
    async sends() {
        const { ctx, sent, notices } = buildCtx();
        await handleMessage(ctx, 's1 hello there', { command: '/msg', matches: [] });
        expect(sent).toEqual([{ sessionId: 's1', text: 'hello there', wake: false, fromSessionId: 's1' }]);
        expect(notices[notices.length - 1]).toContain('Message delivered');
    }

    @Test('--wake asks the gateway to start a turn')
    async wakes() {
        const { ctx, sent, notices } = buildCtx();
        await handleMessage(ctx, '--wake chat-alpha run the tests', { command: '/msg', matches: [] });
        expect(sent).toEqual([{ sessionId: 'chat-alpha', text: 'run the tests', wake: true, fromSessionId: 's1' }]);
        expect(notices[notices.length - 1]).toContain('turn started');
    }

    @Test('usage, missing targets and delivery failures stay actionable')
    async failures() {
        const usage = buildCtx();
        await handleMessage(usage.ctx, '', { command: '/msg', matches: [] });
        expect(usage.notices[usage.notices.length - 1]).toContain('Usage: /msg');

        const missing = buildCtx();
        await handleMessage(missing.ctx, 'nope text', { command: '/msg', matches: [] });
        expect(missing.notices[missing.notices.length - 1]).toContain('No session matches');

        const failed = buildCtx({ fail: true });
        await handleMessage(failed.ctx, 's1 hi', { command: '/msg', matches: [] });
        expect(failed.notices[failed.notices.length - 1]).toContain('target locked');
    }

    @Test('messaging is opt-in: disabled by default with an actionable hint')
    async disabledByDefault() {
        const { ctx, sent, notices } = buildCtx();
        ctx.state.crossSessionMessages = false;
        await handleMessage(ctx, 's1 hello', { command: '/msg', matches: [] });
        expect(sent).toEqual([]);
        expect(notices[notices.length - 1]).toContain('/settings');
    }
}
