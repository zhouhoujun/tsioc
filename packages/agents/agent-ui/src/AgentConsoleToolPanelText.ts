import { formatAgentUiLabel, type AgentUiTranslator } from './agent-ui.i18n';

/**
 * Localized text for the `/tools` inspector rows. Split out of
 * `AgentConsolePanels.ts` to keep that baseline file inside its size budget.
 */
export function formatToolPanelTitle(
    translator: AgentUiTranslator | null | undefined,
    count: number,
    index: number
): string {
    return formatAgentUiLabel(translator, 'agent.menu.tools.title', 'tools {count} · {index}/{count}', { count, index });
}

export function formatToolPanelInactiveSuffix(translator: AgentUiTranslator | null | undefined): string {
    return formatAgentUiLabel(translator, 'agent.menu.tools.inactiveSuffix', ' [inactive]');
}

export function formatToolPanelStatus(
    translator: AgentUiTranslator | null | undefined,
    tool: { active?: boolean; activationKind?: string; toolset?: string }
): string {
    const state = tool.active
        ? formatAgentUiLabel(translator, 'agent.menu.tools.stateActive', 'active')
        : formatAgentUiLabel(translator, 'agent.menu.tools.stateInactive', 'inactive');
    const activation = tool.activationKind === 'deferred'
        ? formatAgentUiLabel(translator, 'agent.menu.tools.activationDeferred', 'deferred')
        : !tool.activationKind || tool.activationKind === 'always'
            ? formatAgentUiLabel(translator, 'agent.menu.tools.activationAlways', 'always')
            : tool.activationKind;
    return formatAgentUiLabel(translator, 'agent.menu.tools.status', 'status {status} · activation {activation} · toolset {toolset}', {
        status: state,
        activation,
        toolset: tool.toolset || 'default'
    });
}

export function formatToolPanelLastRun(
    translator: AgentUiTranslator | null | undefined,
    status: string,
    duration: string,
    summary: string
): string {
    return formatAgentUiLabel(translator, 'agent.menu.tools.lastRun', 'last run {status}{duration}: {summary}', { status, duration, summary });
}
