import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { COMMAND_HANDLERS } from '../src/AgentConsoleCommandHandlers';
import { runReloadCommandView } from '../src/AgentConsoleReloadCommand';

function metaFor(command: string) {
    return { command, matches: [command] };
}

function renameCtx() {
    const calls: any = { titled: [], notices: [], outputs: [], title: undefined, refreshed: 0 };
    const state: any = { sessionId: 's1', setTitle: (title: string) => { calls.title = title; } };
    const ctx: any = {
        state,
        translator: null,
        sessionService: { setSessionTitle: async (sessionId: string, title?: string) => { calls.titled.push([sessionId, title]); } },
        notify: (message: string) => calls.notices.push(message),
        pushCommandOutput: (command: string, text: string) => calls.outputs.push([command, text]),
        refreshSessions: async () => { calls.refreshed += 1; },
        updateTerminalTitle: () => undefined
    };
    return { ctx, calls };
}

@Suite('opencode parity commands: /rename, /reload, /restart')
export class OpenCodeParityCommandsTest {
    @Test('/rename sets the session title and labels its output')
    async renameSetsTitle() {
        const { ctx, calls } = renameCtx();
        await COMMAND_HANDLERS['/rename'](ctx, 'new name', metaFor('/rename'));
        expect(calls.titled).toEqual([['s1', 'new name']]);
        expect(calls.title).toEqual('new name');
        expect(calls.outputs[0][0]).toEqual('/rename');
        expect(calls.refreshed).toEqual(1);
    }

    @Test('/rename without a name prints usage and leaves the session alone')
    async renameUsage() {
        const { ctx, calls } = renameCtx();
        await COMMAND_HANDLERS['/rename'](ctx, '', metaFor('/rename'));
        expect(calls.titled).toEqual([]);
        expect(calls.notices[0]).toContain('Usage: /rename');
    }

    @Test('/title keeps the window-title verbs and the legacy session rename')
    async titleLegacy() {
        const { ctx, calls } = renameCtx();
        const verbs: string[] = [];
        ctx.runTitleCommand = async (args: string) => { verbs.push(args); return true; };
        await COMMAND_HANDLERS['/title'](ctx, 'list', metaFor('/title'));
        await COMMAND_HANDLERS['/title'](ctx, 'set project,status', metaFor('/title'));
        expect(verbs).toEqual(['list', 'set project,status']);
        await COMMAND_HANDLERS['/title'](ctx, 'legacy title', metaFor('/title'));
        expect(calls.titled).toEqual([['s1', 'legacy title']]);
        expect(calls.outputs[0][0]).toEqual('/title');
    }

    @Test('/reload re-reads the workspace settings and reports it')
    async reload() {
        let reloads = 0;
        const notices: string[] = [];
        await runReloadCommandView(async () => { reloads += 1; }, message => notices.push(message), null);
        expect(reloads).toEqual(1);
        expect(notices[0]).toContain('reloaded');
    }

    @Test('/restart relaunches with the current session after restoring the terminal')
    async restart() {
        const calls: any = { exited: 0, restarts: [] };
        const ctx: any = {
            state: { sessionId: 'session-9', restartAction: (id: string) => calls.restarts.push(id) },
            translator: null,
            notify: () => undefined,
            requestTerminalExit: async () => { calls.exited += 1; }
        };
        await COMMAND_HANDLERS['/restart'](ctx, '', metaFor('/restart'));
        expect(calls.exited).toEqual(1);
        expect(calls.restarts).toEqual(['session-9']);
    }

    @Test('/restart reports unavailability instead of exiting when no hook is wired')
    async restartUnavailable() {
        const notices: string[] = [];
        const ctx: any = {
            state: { sessionId: 's1' },
            translator: null,
            notify: (message: string) => notices.push(message),
            requestTerminalExit: async () => { throw new Error('must not exit'); }
        };
        await COMMAND_HANDLERS['/restart'](ctx, '', metaFor('/restart'));
        expect(notices[0]).toContain('Restart is unavailable');
    }
}
