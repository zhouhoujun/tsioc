import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { runSteerCommand } from '../src/AgentConsoleSteerCommands';

function build(running: boolean) {
    const calls: Array<{ method: string; params: any }> = [];
    const notices: string[] = [];
    const host: any = {
        translator: null,
        state: {
            sessionId: 'chat-1',
            steerMode: false,
            pendingAttachments: [],
            setSteerMode: (value: boolean) => { host.state.steerMode = value; },
            clearPendingAttachments: () => { host.state.pendingAttachments = []; }
        },
        notify: (message: string) => notices.push(message),
        persistSettings: async () => undefined,
        isTurnInProgress: () => running,
        appRpc: {
            request: async (method: string, params: any) => { calls.push({ method, params }); return {}; }
        },
        rpcRequestContext: () => ({})
    };
    return { host, calls, notices };
}

@Suite('step-boundary steer command')
export class SteerStepBoundaryTest {
    @Test('/steer <text> queues a steer item while a turn is running')
    async queuesSteer() {
        const { host, calls, notices } = build(true);
        expect(await runSteerCommand(host, 'focus on tests')).toEqual(true);
        expect(calls[0].method).toEqual('session.inbox.append');
        expect(calls[0].params.sessionId).toEqual('chat-1');
        expect(calls[0].params.item).toMatchObject({
            kind: 'steer',
            state: 'queued',
            payload: { input: 'focus on tests', command: false }
        });
        expect(notices[0]).toContain('Steer queued');
    }

    @Test('/steer <text> explains that a running turn is required when idle')
    async idle() {
        const { host, calls, notices } = build(false);
        await runSteerCommand(host, 'focus on tests');
        expect(calls).toEqual([]);
        expect(notices[0]).toContain('needs a running turn');
    }

    @Test('/steer <text> uses the in-process runtime without a gateway')
    async localRuntime() {
        const appended: any[] = [];
        const { host, notices } = build(true);
        host.appRpc = undefined;
        host.runtime = { appendInboxItem: async (_sessionId: string, item: any) => { appended.push(item); return item; } };
        await runSteerCommand(host, 'local steer');
        expect(appended[0]).toMatchObject({ kind: 'steer', payload: { input: 'local steer' } });
        expect(notices[0]).toContain('Steer queued');
    }

    @Test('/steer on still toggles the mode')
    async toggles() {
        const { host, calls } = build(false);
        await runSteerCommand(host, 'on');
        expect(host.state.steerMode).toEqual(true);
        expect(calls).toEqual([]);
    }
}
