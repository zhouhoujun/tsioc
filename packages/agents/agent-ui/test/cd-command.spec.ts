import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleComponent } from '../src/AgentConsoleComponent';

interface CdCalls { workspace: string[]; notices: string[]; }

function cdHost(adapter: any): { host: any; calls: CdCalls } {
    const calls: CdCalls = { workspace: [], notices: [] };
    const host: any = {
        workspace: '/start',
        translator: null,
        state: { setWorkspace: (value: string) => { calls.workspace.push(value); } },
        resolveFileAdapter: () => adapter,
        persistInputHistory: async () => undefined,
        restoreInputHistory: async () => undefined,
        notify: (message: string) => { calls.notices.push(message); }
    };
    return { host, calls };
}

const runCd = (host: any, args: string) => (AgentConsoleComponent.prototype as any).runCdCommand.call(host, args);

/**
 * `/cd /nonexistent` used to switch the session workspace without checking the
 * path, so file tools pointed at a directory that does not exist.
 */
@Suite('/cd validates its target')
export class CdCommandTest {

    @Test('a missing directory is rejected with an actionable notice')
    async rejectsMissingDirectory() {
        const { host, calls } = cdHost({ stat: async (path: string) => (path === '/ok' ? { isDirectory: () => true } : null) });
        await runCd(host, '/missing-dir');
        expect(calls.workspace).toEqual([]);
        expect(calls.notices.join(' ')).toContain('/missing-dir');
        await runCd(host, '/ok');
        expect(calls.workspace).toEqual(['/ok']);
    }

    @Test('a file is not a workspace')
    async rejectsFile() {
        const { host, calls } = cdHost({ stat: async () => ({ isDirectory: () => false }) });
        await runCd(host, '/etc/hosts');
        expect(calls.workspace).toEqual([]);
        expect(calls.notices.length).toEqual(1);
    }

    @Test('relative targets are resolved against the current workspace')
    async resolvesRelative() {
        const { host, calls } = cdHost({ stat: async () => ({ isDirectory: () => true }) });
        await runCd(host, 'sub/dir');
        expect(calls.workspace).toEqual(['/start/sub/dir']);
    }
}
