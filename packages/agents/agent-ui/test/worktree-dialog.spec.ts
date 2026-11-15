import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { runWorktreeCommand } from '../src/AgentConsoleWorktreeCommands';

function createCtx(items: Array<{ path: string; branch?: string }>) {
    const notices: string[] = [];
    const overlays: Array<{ title: string; lines: string[] }> = [];
    const ctx: any = {
        translator: null,
        notify: (message: string) => notices.push(message),
        state: {
            worktreeCommand: async () => ({ action: 'list', items }),
            openTextOverlay: (title: string, lines: string[]) => overlays.push({ title, lines })
        }
    };
    return { ctx, notices, overlays };
}

@Suite('/worktree list dialog')
export class WorktreeDialogTest {
    @Test('lists worktrees in a titled dialog instead of a generic notice')
    async listUsesDialog() {
        const { ctx, notices, overlays } = createCtx([
            { path: '.worktrees/a', branch: 'feat-a' },
            { path: '.worktrees/b' }
        ]);
        await runWorktreeCommand(ctx, 'list');
        expect(notices).toEqual([]);
        expect(overlays.length).toEqual(1);
        expect(overlays[0].title).toEqual('Worktrees');
        expect(overlays[0].lines).toEqual(['.worktrees/a  [feat-a]', '.worktrees/b']);
    }

    @Test('an empty list stays a short toast')
    async emptyStaysToast() {
        const { ctx, notices, overlays } = createCtx([]);
        await runWorktreeCommand(ctx, 'list');
        expect(overlays).toEqual([]);
        expect(notices.length).toEqual(1);
    }
}
