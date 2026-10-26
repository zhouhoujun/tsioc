import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { runSnapshotsCommand } from '../src/AgentConsoleSnapshotCommands';

interface Calls { restore: string[]; delete: string[]; open: string[]; selects: number; notices: string[]; }

function buildHost(id = 'snap_abc123', prefixed = false) {
    const calls: Calls = { restore: [], delete: [], open: [], selects: 0, notices: [] };
    const snapshots = prefixed
        ? [{ snapshotId: 'snap_abc123', label: 'snapshot', messageCount: 3 }, { snapshotId: 'snap_xyz789', label: 'other', messageCount: 1 }]
        : [{ snapshotId: id, label: 'snapshot', messageCount: 3 }];
    const host: any = {
        translator: null,
        state: { sessionId: 's1', consoleOptions: { selectHint: '' } },
        sessionService: {
            listSessionSnapshots: async () => snapshots,
            restoreSessionSnapshot: async (_sessionId: string, snapshotId: string) => { calls.restore.push(snapshotId); },
            deleteSessionSnapshot: async (_sessionId: string, snapshotId: string) => { calls.delete.push(snapshotId); }
        },
        select: async () => { calls.selects += 1; return undefined; },
        refreshSessions: async () => undefined,
        openSession: async (sessionId: string) => { calls.open.push(sessionId); },
        notify: (message: string) => { calls.notices.push(message); }
    };
    return { host, calls };
}

/**
 * `/snapshots restore <id>` used to ignore its arguments and always open the
 * picker, although the registry documents restore/delete.
 */
@Suite('/snapshots arguments')
export class SnapshotsArgumentsTest {

    @Test('restore <id> acts without the picker')
    async restoresById() {
        const { host, calls } = buildHost();
        await runSnapshotsCommand(host, 'restore snap_abc123');
        expect(calls.restore).toEqual(['snap_abc123']);
        expect(calls.open).toEqual(['s1']);
        expect(calls.selects).toEqual(0);
        expect(calls.notices.join(' ')).toContain('Snapshot restored');
    }

    @Test('a unique prefix resolves to the full id')
    async resolvesUniquePrefix() {
        const { host, calls } = buildHost('snap_abc123', true);
        await runSnapshotsCommand(host, 'restore snap_ab');
        expect(calls.restore).toEqual(['snap_abc123']);
        expect(calls.selects).toEqual(0);
    }

    @Test('an unknown id fails with the id in the message')
    async unknownIdFails() {
        const { host, calls } = buildHost();
        let thrown: any = null;
        try {
            await runSnapshotsCommand(host, 'restore snap_missing');
        } catch (error) {
            thrown = error;
        }
        expect(String(thrown?.message)).toContain('snap_missing');
        expect(calls.restore).toEqual([]);
    }

    @Test('delete <id> removes that snapshot')
    async deletesById() {
        const { host, calls } = buildHost();
        await runSnapshotsCommand(host, 'delete snap_abc123');
        expect(calls.delete).toEqual(['snap_abc123']);
        expect(calls.selects).toEqual(0);
    }

    @Test('no arguments still opens the picker')
    async pickerWithoutArgs() {
        const { host, calls } = buildHost();
        await runSnapshotsCommand(host, '');
        expect(calls.selects).toEqual(1);
    }

    @Test('an unknown verb reports the usage')
    async unknownVerb() {
        const { host } = buildHost();
        let thrown: any = null;
        try {
            await runSnapshotsCommand(host, 'rename x');
        } catch (error) {
            thrown = error;
        }
        expect(String(thrown?.message)).toContain('/snapshots');
    }
}
