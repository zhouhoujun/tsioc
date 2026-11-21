import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { handleDelete } from '../src/AgentConsoleSessionCommandHandlers';

function buildCtx(options: { running?: boolean; pick?: string; fail?: boolean } = {}) {
    const calls: {
        deleted: string[];
        opened: Array<string | undefined>;
        notices: string[];
        busy: number;
        refreshed: number;
        selects: Array<{ title: string; options: any[] }>;
    } = { deleted: [], opened: [], notices: [], busy: 0, refreshed: 0, selects: [] };
    const ctx: any = {
        translator: null,
        state: {
            sessionId: 's1',
            sessions: [
                { id: 's1', current: true, title: 'One' },
                { id: 's2', title: 'Two' }
            ]
        },
        sessionService: {
            deleteSession: async (id: string) => {
                if (options.fail) throw new Error('database is locked');
                calls.deleted.push(id);
            }
        },
        refreshSessions: async () => { calls.refreshed += 1; },
        openSession: async (id?: string) => { calls.opened.push(id); },
        select: async (title: string, opts: any[]) => {
            calls.selects.push({ title, options: opts });
            return options.pick;
        },
        notify: (message: string) => calls.notices.push(message),
        notifyBusyState: () => { calls.busy += 1; },
        isTurnInProgress: () => options.running === true
    };
    return { ctx, calls };
}

/**
 * `/delete` is destructive, so the default path is a confirmation dialog and
 * `confirm` is the only way to skip it (for scripted cleanup).
 */
@Suite('session deletion command')
export class SessionDeleteTest {
    @Test('cancelling the confirmation leaves the session untouched')
    async cancel() {
        const { ctx, calls } = buildCtx({ pick: 'cancel' });
        await handleDelete(ctx, '', { command: '/delete', matches: [] });
        expect(calls.deleted).toEqual([]);
        expect(calls.opened).toEqual([]);
        expect(calls.selects.length).toEqual(1);
        expect(calls.selects[0].title).toContain('Delete session');
    }

    @Test('confirming deletes the current session and opens the next one')
    async confirmCurrent() {
        const { ctx, calls } = buildCtx({ pick: 'delete' });
        await handleDelete(ctx, '', { command: '/delete', matches: [] });
        expect(calls.deleted).toEqual(['s1']);
        expect(calls.refreshed).toEqual(1);
        expect(calls.opened).toEqual(['s2']);
        expect(calls.notices[calls.notices.length - 1]).toContain('Deleted session s1');
    }

    @Test('confirm skips the dialog and deleting another session keeps the current tab')
    async confirmFlagOther() {
        const { ctx, calls } = buildCtx({ pick: 'delete' });
        await handleDelete(ctx, 's2 confirm', { command: '/delete', matches: [] });
        expect(calls.selects).toEqual([]);
        expect(calls.deleted).toEqual(['s2']);
        expect(calls.opened).toEqual([]);
    }

    @Test('a running turn blocks deletion of the current session')
    async busy() {
        const { ctx, calls } = buildCtx({ running: true, pick: 'delete' });
        await handleDelete(ctx, '', { command: '/delete', matches: [] });
        expect(calls.busy).toEqual(1);
        expect(calls.selects).toEqual([]);
        expect(calls.deleted).toEqual([]);
    }

    @Test('storage failures surface instead of pretending the session is gone')
    async failure() {
        const { ctx, calls } = buildCtx({ pick: 'delete', fail: true });
        await handleDelete(ctx, '', { command: '/delete', matches: [] });
        expect(calls.opened).toEqual([]);
        expect(calls.notices[calls.notices.length - 1]).toContain('database is locked');
    }
}
