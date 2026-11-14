import * as path from 'path';
import type { Command } from 'commander';
import { WorktreeManager } from '@tsdi/agent-tools';

export interface AgentWorktreeOptions {
    action?: 'create' | 'list' | 'remove';
    name?: string;
    workspace?: string;
    force?: boolean;
}

/**
 * Manage managed git worktrees from the CLI. Session-level switching builds on
 * this in a later batch; the lifecycle commands are useful on their own.
 */
export async function runAgentWorktree(options: AgentWorktreeOptions = {}): Promise<void> {
    const workspace = path.resolve(options.workspace || process.cwd());
    const manager = new WorktreeManager(workspace);
    switch (options.action) {
        case 'list': {
            const items = await manager.list();
            if (!items.length) {
                console.log('No worktrees.');
                return;
            }
            for (const item of items) {
                console.log(`${item.path}${item.branch ? `  [${item.branch}]` : ''}`);
            }
            return;
        }
        case 'remove': {
            if (!options.name) {
                throw new Error('worktree remove requires a name or path.');
            }
            await manager.remove(options.name, options.force === true);
            console.log(`Removed worktree ${options.name}.`);
            return;
        }
        default: {
            if (!options.name) {
                throw new Error('worktree create requires a name.');
            }
            const created = await manager.create(options.name);
            console.log(`Created worktree ${created.path} on branch ${created.branch}.`);
        }
    }
}

/** Register `tsdi-agent worktree create|list|remove`. */
export function registerWorktreeCli(program: Command): void {
    const worktree = program
        .command('worktree')
        .description('Manage session-isolation git worktrees.');

    worktree
        .command('create <name>')
        .option('--workspace <dir>', 'Git workspace. Defaults to cwd.')
        .action(async (name: string, options: any) => {
            await runAgentWorktree({ action: 'create', name, workspace: options.workspace });
        });
    worktree
        .command('list')
        .option('--workspace <dir>', 'Git workspace. Defaults to cwd.')
        .action(async (options: any) => {
            await runAgentWorktree({ action: 'list', workspace: options.workspace });
        });
    worktree
        .command('remove <name>')
        .option('--workspace <dir>', 'Git workspace. Defaults to cwd.')
        .option('--force', 'Force removal even with local changes.')
        .action(async (name: string, options: any) => {
            await runAgentWorktree({ action: 'remove', name, workspace: options.workspace, force: options.force });
        });
}
