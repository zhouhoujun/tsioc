import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState } from '../src';
import { runRewindCommandView } from '../src/AgentConsoleRewind';

function createHost(overrides: Record<string, any> = {}): any {
    const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
    state.configure({ sessionId: 'session-1', workspace: '' });
    const notices: string[] = [];
    return {
        state,
        notices,
        translator: null,
        notify: (message: string) => notices.push(message),
        ...overrides
    };
}

const SNAPSHOTS = [
    { filePath: 'src/a.ts', timestamp: 1, toolName: 'write' },
    { filePath: 'src/b.ts', timestamp: 2, toolName: 'edit' },
    { filePath: 'src/c.ts', timestamp: 3, toolName: 'apply_patch', files: ['src/c.ts', 'src/d.ts'] }
];

@Suite('/rewind checkpoints')
export class RewindTest {
    @Test('lists snapshots newest-first and undoes the selected depth')
    async rewinds() {
        const undos: string[] = [];
        const host = createHost({
            appRpc: {
                request: async (method: string) => {
                    if (method === 'session.file_snapshot.list') return { snapshots: SNAPSHOTS };
                    if (method === 'session.undo_file') {
                        undos.push(method);
                        return { filePath: `restored-${undos.length}` };
                    }
                    return null;
                }
            },
            select: async (_title: string, options: any[], index: number) => {
                expect(options.length).toEqual(3);
                expect(options[2].description).toContain('apply_patch');
                expect(index).toEqual(2);
                return '2';
            }
        });
        await runRewindCommandView(host);
        expect(undos.length).toEqual(2);
        expect(host.notices[0]).toContain('2 file change');
    }

    @Test('empty history reports instead of opening a menu')
    async empty() {
        const host = createHost({ runtime: { listFileSnapshots: () => [] }, select: async () => '1' });
        await runRewindCommandView(host);
        expect(host.notices[0]).toContain('No captured file changes');
    }

    @Test('escaping the picker performs no undo')
    async cancelled() {
        let undos = 0;
        const host = createHost({
            runtime: {
                listFileSnapshots: () => SNAPSHOTS,
                undoFileChange: async () => { undos += 1; return null; }
            },
            select: async () => undefined
        });
        await runRewindCommandView(host);
        expect(undos).toEqual(0);
    }
}
