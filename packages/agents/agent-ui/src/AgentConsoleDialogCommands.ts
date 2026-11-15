import type { CommandHandlerContext } from './AgentConsoleCommandHandlers';
import { formatAgentUiNotice } from './agent-ui.i18n';
import { AGENT_CONSOLE_DIALOG_ROUTES, listAgentConsoleDialogRoutes, resolveAgentConsoleDialogRoute } from './AgentConsoleDialogRoutes';

/**
 * `/dialog [id|path|group]` — deep-link into a dialog route. With no argument it
 * lists the route catalog grouped by category; with an argument it dispatches
 * the route's command through the normal handler pipeline.
 */
export async function handleDialogCommand(ctx: CommandHandlerContext, args: string): Promise<boolean> {
    const query = String(args || '').trim();
    if (!query) {
        const groups = new Map<string, string[]>();
        for (const route of listAgentConsoleDialogRoutes()) {
            const list = groups.get(route.group) ?? [];
            list.push(`${route.id}  ${route.title}  ${route.path}`);
            groups.set(route.group, list);
        }
        const lines = [...groups.entries()].flatMap(([group, entries]) => [`[${group}]`, ...entries]);
        ctx.state.openTextOverlay(
            formatAgentUiNotice(ctx.translator, 'dialogRoutesTitle'),
            lines,
            Math.min(24, lines.length)
        );
        return true;
    }
    const route = resolveAgentConsoleDialogRoute(query);
    if (!route) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'dialogRouteUnknown', { route: query }));
        return true;
    }
    if (!ctx.executeCommand) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'dialogRouteUnknown', { route: query }));
        return true;
    }
    await ctx.executeCommand(route.command);
    return true;
}

export { AGENT_CONSOLE_DIALOG_ROUTES };
