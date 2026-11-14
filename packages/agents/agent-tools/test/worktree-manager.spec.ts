import expect = require('expect');
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Suite, Test } from '@tsdi/unit';
import { runChildProcess } from '@tsdi/agent';
import { WorktreeManager } from '../coding';

async function git(cwd: string, args: string[]): Promise<void> {
    const result = await runChildProcess({ command: 'git', args, cwd, timeoutMs: 30000, stdin: '' });
    if (result.kind !== 'exit' || result.exitCode !== 0) {
        throw new Error(result.stderr || 'git failed');
    }
}

@Suite('managed worktrees')
export class WorktreeManagerTest {
    @Test('creates, lists and removes an isolated worktree')
    async roundTrip() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'worktree-manager-'));
        try {
            await git(workspace, ['init']);
            await git(workspace, ['config', 'user.email', 'test@example.com']);
            await git(workspace, ['config', 'user.name', 'Test']);
            fs.writeFileSync(path.join(workspace, 'README.md'), 'base');
            await git(workspace, ['add', '.']);
            await git(workspace, ['commit', '-m', 'base']);

            const manager = new WorktreeManager(workspace);
            const created = await manager.create('feature-a');
            expect(fs.existsSync(path.join(created.path, 'README.md'))).toEqual(true);
            fs.writeFileSync(path.join(created.path, 'feature.txt'), 'isolated');
            expect(fs.existsSync(path.join(workspace, 'feature.txt'))).toEqual(false);

            const list = await manager.list();
            expect(list.some(item => item.path === created.path)).toEqual(true);
            expect(list.some(item => item.branch === 'tsdi/feature-a')).toEqual(true);

            await git(created.path, ['add', '.']);
            await git(created.path, ['commit', '-m', 'feature']);
            await manager.merge('feature-a');
            expect(fs.existsSync(path.join(workspace, 'feature.txt'))).toEqual(true);

            await manager.remove('feature-a', true);
            expect(fs.existsSync(created.path)).toEqual(false);
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }
}
