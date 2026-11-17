import type { CommandHandlerContext } from './AgentConsoleCommandHandlers';
import { formatAgentUiNotice } from './agent-ui.i18n';

export interface AgentConsoleWorktreeRequest {
    action: 'create' | 'list' | 'merge' | 'remove' | 'enter';
    name?: string;
    force?: boolean;
    /** Skip the interactive confirmation for destructive actions. */
    yes?: boolean;
}

export interface AgentConsoleWorktreeResult {
    action: 'create' | 'list' | 'merge' | 'remove';
    path?: string;
    branch?: string;
    items?: Array<{ path: string; branch?: string }>;
}

/** Parse `/worktree [create] <name> | list | merge <name> | remove <name> | enter <name> [--force]`. */
export function parseWorktreeArgs(args: string): AgentConsoleWorktreeRequest {
    const tokens = String(args || '').trim().split(/\s+/).filter(Boolean);
    const action = tokens[0] === 'list' || tokens[0] === 'merge' || tokens[0] === 'remove'
        || tokens[0] === 'create' || tokens[0] === 'enter'
        ? tokens.shift()!
        : 'create';
    return {
        action: action as AgentConsoleWorktreeRequest['action'],
        name: tokens.find(token => !token.startsWith('--')),
        force: tokens.includes('--force'),
        yes: tokens.includes('--yes')
    };
}

function worktreeBaseName(path: string): string {
    return String(path || '').split(/[\\/]/).filter(Boolean).pop() || '';
}

export async function runWorktreeCommand(ctx: CommandHandlerContext, args: string): Promise<boolean> {
    if (!ctx.state.worktreeCommand) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'worktreeUnavailable'));
        return true;
    }
    const request = parseWorktreeArgs(args);
    if (request.action !== 'list' && request.action !== 'enter' && !request.name) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'worktreeUsage'));
        return true;
    }
    try {
        if (request.action === 'enter') {
            // Resolve the managed worktree through the same list the user sees,
            // then reuse /cd so validation, history and workspace state agree.
            const list = await ctx.state.worktreeCommand({ action: 'list' });
            const items = list.items || [];
            let targetPath = '';
            if (request.name) {
                const target = items.find(item =>
                    item.path === request.name
                    || worktreeBaseName(item.path) === request.name
                    || item.branch === request.name
                );
                if (target) {
                    targetPath = target.path;
                }
            } else if (items.length) {
                targetPath = await ctx.select(
                    formatAgentUiNotice(ctx.translator, 'worktreeEnterTitle'),
                    items.map(item => ({
                        label: `${worktreeBaseName(item.path)}${item.branch ? `  [${item.branch}]` : ''}`,
                        value: item.path,
                        description: item.path
                    })),
                    0,
                    formatAgentUiNotice(ctx.translator, 'worktreeSelectHint')
                ) || '';
            }
            if (!targetPath) {
                if (!items.length) {
                    ctx.notify(formatAgentUiNotice(ctx.translator, 'worktreeListEmpty'));
                } else if (request.name) {
                    ctx.notify(formatAgentUiNotice(ctx.translator, 'worktreeNotFound', { name: request.name }));
                }
                return true;
            }
            if (ctx.runCdCommand) {
                await ctx.runCdCommand(targetPath);
            }
            ctx.notify(formatAgentUiNotice(ctx.translator, 'worktreeEntered', {
                name: request.name ?? worktreeBaseName(targetPath),
                path: targetPath
            }));
            return true;
        }
        if (request.action === 'remove' && !request.yes) {
            const confirmed = await ctx.select(
                formatAgentUiNotice(ctx.translator, 'worktreeRemoveTitle', { name: request.name ?? '' }),
                [
                    { label: formatAgentUiNotice(ctx.translator, 'worktreeRemoveConfirm'), value: 'remove' },
                    { label: formatAgentUiNotice(ctx.translator, 'worktreeRemoveCancel'), value: 'cancel' }
                ],
                1,
                formatAgentUiNotice(ctx.translator, 'worktreeRemoveHint')
            );
            if (confirmed !== 'remove') {
                ctx.notify(formatAgentUiNotice(ctx.translator, 'worktreeRemoveCancelled'));
                return true;
            }
        }
        const { yes: _skipConfirm, ...runtimeRequest } = request;
        const result = await ctx.state.worktreeCommand(runtimeRequest);
        if (result.action === 'list') {
            if (!result.items?.length) {
                ctx.notify(formatAgentUiNotice(ctx.translator, 'worktreeListEmpty'));
            } else {
                const lines = result.items.map(item => `${item.path}${item.branch ? `  [${item.branch}]` : ''}`);
                // A worktree list is a read-only dialog, not a generic notice.
                ctx.state.openTextOverlay(
                    formatAgentUiNotice(ctx.translator, 'worktreesTitle'),
                    lines,
                    Math.min(24, lines.length)
                );
            }
        } else if (result.action === 'create') {
            ctx.notify(formatAgentUiNotice(ctx.translator, 'worktreeCreated', { path: result.path ?? '', branch: result.branch ?? '' }));
        } else if (result.action === 'merge') {
            ctx.notify(formatAgentUiNotice(ctx.translator, 'worktreeMerged', { name: request.name ?? '' }));
        } else {
            ctx.notify(formatAgentUiNotice(ctx.translator, 'worktreeRemoved', { name: request.name ?? '' }));
        }
    } catch (error) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'worktreeFailed', { error: error instanceof Error ? error.message : String(error) }));
    }
    return true;
}
