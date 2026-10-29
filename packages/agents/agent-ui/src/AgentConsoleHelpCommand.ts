import { CommandHandlerContext } from './AgentConsoleCommandHandlerContext';
import { buildAgentConsoleHelpGroups, buildAgentConsoleHelpLines } from './AgentConsoleHelpView';
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
    const openGroup = (group: string, label: string) => {
        const lines = buildAgentConsoleHelpLines({ group, describe });
        ctx.state.openTextOverlay(`${title} · ${label}`, lines, Math.min(24, lines.length));
    };
    if (!query) {
        const groups = buildAgentConsoleHelpGroups(describe, count =>
            formatAgentUiNotice(ctx.translator, 'helpGroupCount', { count }));
        const selected = await ctx.select(title, groups, 0, formatAgentUiNotice(ctx.translator, 'helpGroupHint'));
        const picked = groups.find(group => group.value === selected);
        if (picked) {
            openGroup(picked.value.replace(/^group:/, ''), picked.label);
        }
        return true;
    }
    const group = query.toLowerCase();
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
