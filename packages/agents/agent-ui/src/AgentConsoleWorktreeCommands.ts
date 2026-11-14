import type { CommandHandlerContext } from './AgentConsoleCommandHandlers';
import { formatAgentUiNotice } from './agent-ui.i18n';

export interface AgentConsoleWorktreeRequest {
    action: 'create' | 'list' | 'merge' | 'remove';
    name?: string;
    force?: boolean;
}

export interface AgentConsoleWorktreeResult {
    action: 'create' | 'list' | 'merge' | 'remove';
    path?: string;
    branch?: string;
    items?: Array<{ path: string; branch?: string }>;
}

/** Parse `/worktree [create] <name> | list | merge <name> | remove <name> [--force]`. */
export function parseWorktreeArgs(args: string): AgentConsoleWorktreeRequest {
    const tokens = String(args || '').trim().split(/\s+/).filter(Boolean);
    const action = tokens[0] === 'list' || tokens[0] === 'merge' || tokens[0] === 'remove' || tokens[0] === 'create'
        ? tokens.shift()!
        : 'create';
    return {
        action: action as AgentConsoleWorktreeRequest['action'],
        name: tokens.find(token => !token.startsWith('--')),
        force: tokens.includes('--force')
    };
}

export async function runWorktreeCommand(ctx: CommandHandlerContext, args: string): Promise<boolean> {
    if (!ctx.state.worktreeCommand) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'worktreeUnavailable'));
        return true;
    }
    const request = parseWorktreeArgs(args);
    if (request.action !== 'list' && !request.name) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'worktreeUsage'));
        return true;
    }
    try {
        const result = await ctx.state.worktreeCommand(request);
        if (result.action === 'list') {
            if (!result.items?.length) {
                ctx.notify(formatAgentUiNotice(ctx.translator, 'worktreeListEmpty'));
            } else {
                ctx.notify(result.items.map(item => `${item.path}${item.branch ? `  [${item.branch}]` : ''}`).join('\n'));
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
