import { CommandHandlerContext } from './AgentConsoleCommandHandlerContext';
import { buildAgentConsoleHelpGroups, buildAgentConsoleHelpLines } from './AgentConsoleHelpView';
import { buildAgentConsoleDialogRouteLines } from './AgentConsoleDialogRoutes';
import { formatAgentUiNotice, formatAgentPanelLabel as panelLabel } from './agent-ui.i18n';

/**
 * `/help` is a read-only catalogue: a group dialog first, then a scrollable
 * command panel. It never executes the highlighted command (the old flat
 * select menu could run `/exit` or `/restart` on Enter).
 */
export async function runHelpCommand(ctx: CommandHandlerContext, args: string): Promise<boolean> {
    const query = String(args || '').trim();
    const describe = (key: string, fallback: string) => {
        const value = ctx.translator?.translate(key);
        return value && value !== key ? value : fallback;
    };
    const title = panelLabel(ctx.translator, 'select', 'help', 'Help');
    const buildGroups = () => buildAgentConsoleHelpGroups(describe, count =>
        formatAgentUiNotice(ctx.translator, 'helpGroupCount', { count }));
    function openGroup(group: string, label: string): void {
        const lines = buildAgentConsoleHelpLines({ group, describe });
        // Esc/✕ returns to the group list, matching the other stacked dialogs.
        ctx.state.openTextOverlay(`${title} · ${label}`, lines, Math.min(24, lines.length), () => {
            void openGroups();
        });
    }
    function openRouteCatalogue(fromGroupList: boolean): void {
        const lines = buildAgentConsoleDialogRouteLines();
        ctx.state.openTextOverlay(
            formatAgentUiNotice(ctx.translator, 'dialogRoutesTitle'),
            lines,
            Math.min(24, lines.length),
            fromGroupList ? () => { void openGroups(); } : undefined
        );
    }
    async function openGroups(): Promise<void> {
        const groups = buildGroups();
        const selected = await ctx.select(title, groups, 0, formatAgentUiNotice(ctx.translator, 'helpGroupHint'));
        const picked = groups.find(group => group.value === selected);
        if (!picked) return;
        if (picked.value === 'routes:all') {
            openRouteCatalogue(true);
            return;
        }
        openGroup(picked.value.replace(/^group:/, ''), picked.label);
    }
    if (!query) {
        await openGroups();
        return true;
    }
    const group = query.toLowerCase();
    // Dialog routes are a separate catalogue (`/dialog <id>`); expose it from
    // the read-only help surface so the routing layer is discoverable.
    if (group === 'dialog' || group === 'dialogs' || group === 'routes') {
        openRouteCatalogue(false);
        return true;
    }
    const groupOption = buildAgentConsoleHelpGroups(describe, count =>
        formatAgentUiNotice(ctx.translator, 'helpGroupCount', { count }))
        .find(item => item.value === `group:${group}`);
    if (groupOption) {
        openGroup(group, groupOption.label);
        return true;
    }
    const lines = buildAgentConsoleHelpLines({ query, describe });
    if (!lines.length) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'helpNoMatches', { query }));
        return true;
    }
    ctx.state.openTextOverlay(title, lines, Math.min(24, lines.length));
    return true;
}
