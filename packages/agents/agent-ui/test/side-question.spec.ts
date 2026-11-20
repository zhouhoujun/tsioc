import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { handleSideQuestion } from '../src/AgentConsoleSideQuestion';

interface CapturedOverlay {
    title: string;
    lines: string[];
}

function buildContext(options: {
    runtime?: any;
    appRpc?: any;
    answer?: string;
    failure?: Error;
} = {}) {
    const overlays: CapturedOverlay[] = [];
    const notices: string[] = [];
    let messagesTouched = false;
    const ctx: any = {
        translator: null,
        notify: (message: string) => { notices.push(message); },
        state: {
            sessionId: 'session-a',
            openTextOverlay: (title: string, lines: string[]) => { overlays.push({ title, lines }); },
            setMessages: () => { messagesTouched = true; }
        },
        runtime: options.failure
            ? { askSideQuestion: async () => { throw options.failure; } }
            : options.runtime ?? (options.answer !== undefined
                ? { askSideQuestion: async () => options.answer }
                : undefined),
        appRpc: options.appRpc,
        rpcRequestContext: () => ({})
    };
    return { ctx, overlays, notices, messagesTouched: () => messagesTouched };
}

@Suite('/btw side questions')
export class SideQuestionCommandTest {
    @Test('shows the answer in a text overlay without touching the transcript')
    async showsAnswer() {
        const fixture = buildContext({ answer: 'Line one\nLine two' });
        expect(await handleSideQuestion(fixture.ctx, 'why did it fail?')).toEqual(true);
        expect(fixture.overlays).toEqual([{ title: 'Side question', lines: ['Line one', 'Line two'] }]);
        expect(fixture.ctx.runtime).toBeDefined();
        expect(fixture.messagesTouched()).toEqual(false);
    }

    @Test('uses the gateway RPC when the host has no local runtime')
    async usesGateway() {
        const calls: any[] = [];
        const fixture = buildContext({
            appRpc: {
                request: async (method: string, params: any) => {
                    calls.push({ method, params });
                    return { answer: 'gateway answer' };
                }
            }
        });
        expect(await handleSideQuestion(fixture.ctx, 'summarize')).toEqual(true);
        expect(calls[0].method).toEqual('session.side_question');
        expect(calls[0].params).toEqual({ sessionId: 'session-a', question: 'summarize' });
        expect(fixture.overlays[0].lines).toEqual(['gateway answer']);
    }

    @Test('usage, empty and failure states are shown as notices')
    async notices() {
        const usage = buildContext({ answer: 'x' });
        await handleSideQuestion(usage.ctx, '   ');
        expect(usage.notices.length).toEqual(1);
        expect(usage.overlays).toEqual([]);

        const empty = buildContext({ answer: '   ' });
        await handleSideQuestion(empty.ctx, 'why?');
        expect(empty.notices.length).toEqual(1);

        const failed = buildContext({ failure: new Error('provider down') });
        await handleSideQuestion(failed.ctx, 'why?');
        expect(failed.notices[0]).toContain('provider down');
    }

    @Test('a host without runtime or RPC reports unavailability')
    async unavailable() {
        const fixture = buildContext();
        await handleSideQuestion(fixture.ctx, 'why?');
        expect(fixture.notices.length).toEqual(1);
        expect(fixture.overlays).toEqual([]);
    }
}
