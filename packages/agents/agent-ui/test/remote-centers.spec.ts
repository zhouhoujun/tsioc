import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    maskAgentConsoleRemoteUrl,
    sanitizeAgentConsoleRemoteCenters
} from '../src/AgentConsoleRemoteCenterConfig';
import { runRemotesCommand } from '../src/AgentConsoleRemoteCenterCommands';

function createHost(remoteCenters: any[] = []) {
    const overlays: Array<{ title: string; lines: string[] }> = [];
    const notices: string[] = [];
    const persisted: any[] = [];
    const picks: Array<string | undefined> = [];
    const host: any = {
        translator: null,
        state: {
            remoteCenters,
            openTextOverlay: (title: string, lines: string[]) => overlays.push({ title, lines })
        },
        notify: (message: string) => notices.push(message),
        persistSettings: async (patch: any) => { persisted.push(patch); },
        select: async () => picks.shift()
    };
    return { host, overlays, notices, persisted, picks };
}

function rpcFactory(sessionsByUrl: Record<string, any[]>) {
    return (remote: any) => ({
        request: async (method: string) => {
            expect(method).toEqual('session.list');
            const sessions = sessionsByUrl[remote.url];
            if (!sessions) {
                throw new Error('connect ECONNREFUSED');
            }
            return sessions;
        }
    });
}

/**
 * Remote Agent Center v0: read-only aggregation. Configuration lives in the
 * workspace settings; the command only reads `session.list`, so a stale or
 * hostile gateway can never trigger a local side effect.
 */
@Suite('remote agent centers')
export class RemoteCentersTest {
    @Test('sanitizes configured centers and rejects unusable entries')
    sanitize() {
        expect(sanitizeAgentConsoleRemoteCenters([
            { name: 'laptop', url: 'http://127.0.0.1:3200/', token: ' t1 ' },
            { name: 'LAPTOP', url: 'http://dup' },
            { name: '', url: 'http://missing-name' },
            { name: 'bad', url: 'ftp://nope' },
            { name: 'desk', url: 'https://desk.example:3200' }
        ])).toEqual([
            { name: 'laptop', url: 'http://127.0.0.1:3200', token: 't1' },
            { name: 'desk', url: 'https://desk.example:3200' }
        ]);
        expect(sanitizeAgentConsoleRemoteCenters(undefined)).toEqual([]);
        expect(maskAgentConsoleRemoteUrl('https://user:secret@host:3200/')).toEqual('https://***:***@host:3200');
        expect(maskAgentConsoleRemoteUrl('not a url')).toEqual('not a url');
    }

    @Test('lists reachable and unreachable gateways, then shows sessions read-only')
    async listsAndShowsSessions() {
        const { host, overlays, picks } = createHost([{ name: 'laptop', url: 'http://laptop:3200' }]);
        picks.push('laptop');
        await runRemotesCommand(host, '', rpcFactory({
            'http://laptop:3200': [
                { id: 's2', title: 'Newer task', messageCount: 4, updatedAt: Date.now() - 60_000 },
                { id: 's1', title: 'Older task', messageCount: 2, updatedAt: Date.now() - 3 * 3600_000 }
            ]
        }));
        expect(overlays.length).toEqual(1);
        // The real ctx.select renders the picker; this stub only records the
        // read-only session snapshot opened from it.
        expect(overlays[0].title).toContain('laptop');
        const text = overlays[0].lines.join('\n');
        expect(text).toContain('Newer task');
        expect(text).toContain('Older task');
        // Newest first, no token/URL credentials.
        expect(text.indexOf('Newer task')).toBeLessThan(text.indexOf('Older task'));
        expect(text).toContain('read-only');
    }

    @Test('an unreachable gateway reports a notice instead of opening an empty dialog')
    async unreachable() {
        const { host, overlays, notices, picks } = createHost([{ name: 'offline', url: 'http://offline:3200' }]);
        picks.push('offline');
        await runRemotesCommand(host, 'list', rpcFactory({}));
        expect(overlays).toEqual([]);
        expect(notices[notices.length - 1]).toContain('offline');
        expect(notices[notices.length - 1]).toContain('ECONNREFUSED');
    }

    @Test('adds and removes centers in workspace settings')
    async addRemove() {
        const { host, notices, persisted } = createHost([]);
        await runRemotesCommand(host, 'add laptop http://laptop:3200 token-1');
        expect(host.state.remoteCenters).toEqual([{ name: 'laptop', url: 'http://laptop:3200', token: 'token-1' }]);
        expect(persisted[persisted.length - 1]).toEqual({ remotes: host.state.remoteCenters });
        expect(notices[notices.length - 1]).toContain('laptop');

        await runRemotesCommand(host, 'add laptop http://other:3200');
        expect(notices[notices.length - 1]).toContain('already exists');
        expect(host.state.remoteCenters.length).toEqual(1);

        await runRemotesCommand(host, 'add broken not-a-url');
        expect(notices[notices.length - 1]).toContain('Invalid');

        await runRemotesCommand(host, 'remove laptop');
        expect(host.state.remoteCenters).toEqual([]);
        await runRemotesCommand(host, 'remove laptop');
        expect(notices[notices.length - 1]).toContain('No remote center');
    }

    @Test('cancels a remote turn only after confirmation')
    async cancelsRemoteTurn() {
        const calls: Array<{ method: string; params: any }> = [];
        const factory = () => ({
            request: async (method: string, params: any) => {
                calls.push({ method, params });
                if (method === 'session.list') {
                    return [{ id: 'chat-running', title: 'Running task' }];
                }
                if (method === 'run.cancel') {
                    return { sessionId: params.sessionId, cancelled: true };
                }
                throw new Error(`unexpected ${method}`);
            }
        });
        const { host, notices, picks } = createHost([{ name: 'laptop', url: 'http://laptop:3200' }]);
        picks.push('cancel');
        await runRemotesCommand(host, 'cancel laptop chat-r', factory);
        expect(calls.filter(call => call.method === 'run.cancel')).toEqual([
            { method: 'run.cancel', params: { sessionId: 'chat-running' } }
        ]);
        expect(notices[notices.length - 1]).toContain('Cancelled');

        const keep = createHost([{ name: 'laptop', url: 'http://laptop:3200' }]);
        keep.picks.push('keep');
        await runRemotesCommand(keep.host, 'cancel laptop chat-running', factory);
        expect(calls.filter(call => call.method === 'run.cancel').length).toEqual(1);
    }

    @Test('cancel reports missing sessions and unreachable gateways')
    async cancelFailures() {
        const factory = () => ({
            request: async (method: string) => {
                if (method === 'session.list') return [{ id: 'chat-a' }];
                throw new Error('connect ECONNREFUSED');
            }
        });
        const { host, notices } = createHost([{ name: 'laptop', url: 'http://laptop:3200' }]);
        await runRemotesCommand(host, 'cancel laptop nope', factory);
        expect(notices[notices.length - 1]).toContain('No session matches');

        const offline = createHost([{ name: 'offline', url: 'http://offline:3200' }]);
        await runRemotesCommand(offline.host, 'cancel offline chat-a', () => ({
            request: async () => { throw new Error('connect ECONNREFUSED'); }
        }));
        expect(offline.notices[offline.notices.length - 1]).toContain('unreachable');
    }

    @Test('a named center bypasses the picker and never prints its token')
    async namedCenter() {
        const { host, overlays } = createHost([{ name: 'desk', url: 'http://desk:3200', token: 'secret-token' }]);
        await runRemotesCommand(host, 'desk', rpcFactory({
            'http://desk:3200': [{ id: 's1', title: 'Desk task', updatedAt: Date.now() }]
        }));
        expect(overlays.length).toEqual(1);
        const text = overlays[0].lines.join('\n');
        expect(text).toContain('Desk task');
        expect(text).not.toContain('secret-token');
    }
}
