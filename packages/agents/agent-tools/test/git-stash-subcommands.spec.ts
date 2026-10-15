import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { GitOperationsTool } from '../git/git-operations.tool';

function git(cwd: string, args: string[]): void {
    const result = spawnSync('git', args, {
        cwd,
        encoding: 'utf8',
        env: {
            ...process.env,
            GIT_AUTHOR_NAME: 'a',
            GIT_AUTHOR_EMAIL: 'a@b',
            GIT_COMMITTER_NAME: 'a',
            GIT_COMMITTER_EMAIL: 'a@b'
        }
    });
    if (result.status !== 0) {
        throw new Error(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
    }
}

@Suite('git operations stash subcommands')
export class GitStashSubcommandsTest {

    @Test('stash_list and stash_pop run as separate git subcommand arguments')
    async stashSubcommands() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'tsioc-git-'));
        try {
            git(workspace, ['init', '-q']);
            fs.writeFileSync(path.join(workspace, 'a.txt'), 'one\n');
            git(workspace, ['add', '.']);
            git(workspace, ['commit', '-q', '-m', 'init']);
            fs.writeFileSync(path.join(workspace, 'a.txt'), 'two\n');
            git(workspace, ['stash', 'push', '-q']);

            const tool = new GitOperationsTool({ file: { rootDir: workspace } } as any);
            const context = { sessionId: 'git-stash' } as any;

            const list = await tool.invoke({ action: 'stash_list' }, context);
            expect(list.exitCode).toEqual(0);
            expect(String(list.stderr)).not.toContain('not a git command');

            const pop = await tool.invoke({ action: 'stash_pop' }, context);
            expect(pop.exitCode).toEqual(0);
            // The stashed change is restored.
            expect(fs.readFileSync(path.join(workspace, 'a.txt'), 'utf8')).toEqual('two\n');
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }
}
