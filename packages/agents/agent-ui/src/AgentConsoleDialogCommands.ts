import type { CommandHandlerContext } from './AgentConsoleCommandHandlers';
import { formatAgentUiNotice } from './agent-ui.i18n';
import { AGENT_CONSOLE_DIALOG_ROUTES, groupAgentConsoleDialogRoutes, resolveAgentConsoleDialogRoute } from './AgentConsoleDialogRoutes';

/**
 * `/dialog [id|path|group|prefix]` — deep-link into a dialog route. With no
 * argument it opens the route catalogue as a select dialog (type-to-filter on
 * ids/titles, Enter opens); with an argument it dispatches the route's own
 * command through the normal handler pipeline.
 */
export async function handleDialogCommand(ctx: CommandHandlerContext, args: string): Promise<boolean> {
    const query = String(args || '').trim();
    if (!query) {
        const options = groupAgentConsoleDialogRoutes().flatMap(({ group, routes }) =>
            routes.map(route => ({
                label: `${route.title}  ${route.path}`,
                value: route.id,
                description: `${group} · ${route.kind}`
            })));
        const picked = await ctx.select(
            formatAgentUiNotice(ctx.translator, 'dialogRoutesTitle'),
            options,
            0,
            formatAgentUiNotice(ctx.translator, 'dialogRoutesHint')
        );
        const route = picked ? resolveAgentConsoleDialogRoute(picked) : undefined;
        if (route && ctx.executeCommand) {
            await ctx.executeCommand(route.command);
        }
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
