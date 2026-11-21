import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { handleMessage, resolveCrossSessionTarget } from '../src/AgentConsoleSessionCommandHandlers';

function buildCtx(options: { fail?: boolean } = {}) {
    const sent: Array<{ sessionId: string; text: string; wake?: boolean; fromSessionId?: string }> = [];
    const notices: string[] = [];
    const overlays: Array<{ title: string; lines: string[] }> = [];
    const ctx: any = {
        translator: null,
        state: {
            sessionId: 's1',
            crossSessionMessages: true,
            openTextOverlay: (title: string, lines: string[]) => { overlays.push({ title, lines }); },
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
            },
            listCrossSessionMessages: async () => ({
                messages: [{
                    messageId: 'm1',
                    sessionId: 's1',
                    fromSessionId: 'chat-alpha',
                    content: 'please review',
                    createdAt: Date.now() - 60_000
                }],
                scannedSessions: 2
            })
        },
        notify: (message: string) => notices.push(message)
    };
    return { ctx, sent, notices, overlays };
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
        await handleMessage(ctx, 'chat-alpha hello there', { command: '/msg', matches: [] });
        expect(sent).toEqual([{ sessionId: 'chat-alpha', text: 'hello there', wake: false, fromSessionId: 's1' }]);
        expect(notices[notices.length - 1]).toContain('Message delivered');
    }

    @Test('--wake asks the gateway to start a turn')
    async wakes() {
        const { ctx, sent, notices } = buildCtx();
        await handleMessage(ctx, '--wake chat-alpha run the tests', { command: '/msg', matches: [] });
        expect(sent).toEqual([{ sessionId: 'chat-alpha', text: 'run the tests', wake: true, fromSessionId: 's1' }]);
        expect(notices[notices.length - 1]).toContain('turn started');
    }

    @Test('sending to the current session is rejected')
    async rejectsSelf() {
        const { ctx, sent, notices } = buildCtx();
        await handleMessage(ctx, 's1 hello', { command: '/msg', matches: [] });
        expect(sent).toEqual([]);
        expect(notices[notices.length - 1]).toContain('current session');
    }

    @Test('/msg list opens a read-only snapshot of cross-session messages')
    async listsMessages() {
        const { ctx, overlays, notices } = buildCtx();
        await handleMessage(ctx, 'list', { command: '/msg', matches: [] });
        expect(overlays.length).toEqual(1);
        expect(overlays[0].title).toContain('Cross-session messages');
        const text = overlays[0].lines.join('\n');
        expect(text).toContain('chat-alpha');
        expect(text).toContain('please review');
        expect(notices).toEqual([]);
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
        await handleMessage(failed.ctx, 'chat-alpha hi', { command: '/msg', matches: [] });
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
