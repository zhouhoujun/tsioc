import type { CommandHandlerContext } from './AgentConsoleCommandHandlers';
import { formatAgentUiNotice } from './agent-ui.i18n';
import { AGENT_CONSOLE_DIALOG_ROUTES, buildAgentConsoleDialogRouteLines, resolveAgentConsoleDialogRoute } from './AgentConsoleDialogRoutes';

/**
 * `/dialog [id|path|group|prefix]` — deep-link into a dialog route. With no
 * argument it lists the route catalogue grouped by category; with an argument
 * it dispatches the route's command through the normal handler pipeline.
 */
export async function handleDialogCommand(ctx: CommandHandlerContext, args: string): Promise<boolean> {
    const query = String(args || '').trim();
    if (!query) {
        const lines = buildAgentConsoleDialogRouteLines();
        ctx.state.openTextOverlay(
            formatAgentUiNotice(ctx.translator, 'dialogRoutesTitle'),
            lines,
            Math.min(24, lines.length)
        );
        return true;
    }
    const route = resolveAgentConsoleDialogRoute(query);
    if (!route || !ctx.executeCommand) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'dialogRouteUnknown', { route: query }));
        return true;
    }
    await ctx.executeCommand(route.command);
    return true;
}

export { AGENT_CONSOLE_DIALOG_ROUTES };
