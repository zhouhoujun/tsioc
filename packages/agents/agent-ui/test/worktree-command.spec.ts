import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { parseWorktreeArgs, runWorktreeCommand } from '../src/AgentConsoleWorktreeCommands';

function context(result: any): any {
    const notices: string[] = [];
    const overlays: Array<{ title: string; lines: string[] }> = [];
    return {
        notices,
        overlays,
        translator: null,
        notify: (message: string) => notices.push(message),
        state: {
            worktreeCommand: async () => result,
            openTextOverlay: (title: string, lines: string[]) => overlays.push({ title, lines })
        }
    };
}

@Suite('/worktree command')
export class WorktreeCommandTest {
    @Test('parses create/list/merge/remove forms')
    parses() {
        expect(parseWorktreeArgs('feature-a')).toEqual({ action: 'create', name: 'feature-a', force: false });
        expect(parseWorktreeArgs('list')).toEqual({ action: 'list', name: undefined, force: false });
        expect(parseWorktreeArgs('merge feature-a')).toEqual({ action: 'merge', name: 'feature-a', force: false });
        expect(parseWorktreeArgs('remove feature-a --force')).toEqual({ action: 'remove', name: 'feature-a', force: true });
    }

    @Test('creates, lists and merges through the host port')
    async runs() {
        const created = context({ action: 'create', path: '/ws/.worktrees/a', branch: 'tsdi/a' });
        await runWorktreeCommand(created, 'a');
        expect(created.notices[0]).toContain('/ws/.worktrees/a');

        const listed = context({ action: 'list', items: [{ path: '/ws/.worktrees/a', branch: 'tsdi/a' }] });
        await runWorktreeCommand(listed, 'list');
        expect(listed.overlays[0].title).toEqual('Worktrees');
        expect(listed.overlays[0].lines.join('\n')).toContain('tsdi/a');

        const merged = context({ action: 'merge' });
        await runWorktreeCommand(merged, 'merge a');
        expect(merged.notices[0]).toContain('Merged');
    }
}
