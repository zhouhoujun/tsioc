import type { CommandHandlerContext } from './AgentConsoleCommandHandlerContext';
import { formatAgentUiNotice, type AgentUiTranslator } from './agent-ui.i18n';

/**
 * `/highlights` — release notes overlay.
 *
 * The list is bundled (no network/fs in agent-ui). `highlightsSeenVersion`
 * lets the console show the panel once after an upgrade when the user has not
 * turned it off; `/highlights` always opens it on demand.
 */

export const AGENT_CONSOLE_HIGHLIGHTS_VERSION = '6.0.31';

export interface AgentConsoleHighlightItem {
    key: string;
    fallback: string;
}

export const AGENT_CONSOLE_HIGHLIGHTS: AgentConsoleHighlightItem[] = [
    { key: 'highlightsItemLsp', fallback: 'LSP diagnostics and formatting: `/check` and `/format`' },
    { key: 'highlightsItemScanner', fallback: 'Opt-in read-only shell commands skip approval prompts' },
    { key: 'highlightsItemUndo', fallback: 'Turn-level `/undo` and `/redo` with ordered approval rules' },
    { key: 'highlightsItemWeb', fallback: 'Web/PWA notifications, pairing and attach workflows' }
];

export interface AgentConsoleHighlightsHost {
    translator?: AgentUiTranslator | null;
    state: { openTextOverlay(kind: string, lines: string[], visibleLines?: number): void };
    persistSettings?(patch: Record<string, any>): Promise<void>;
}

function describe(translator: AgentUiTranslator | null | undefined, key: string, fallback: string): string {
    const value = translator?.translate(key);
    return value && value !== key ? value : fallback;
}

export function buildAgentConsoleHighlightLines(translator?: AgentUiTranslator | null): string[] {
    return AGENT_CONSOLE_HIGHLIGHTS.map(item => `· ${describe(translator, item.key, item.fallback)}`);
}

/** Open the release-highlights panel without touching persisted state. */
export function showAgentConsoleHighlights(host: AgentConsoleHighlightsHost): void {
    const title = formatAgentUiNotice(host.translator, 'highlightsTitle', { version: AGENT_CONSOLE_HIGHLIGHTS_VERSION });
    const lines = [
        formatAgentUiNotice(host.translator, 'highlightsVersion', { version: AGENT_CONSOLE_HIGHLIGHTS_VERSION }),
        ...buildAgentConsoleHighlightLines(host.translator)
    ];
    host.state.openTextOverlay(title, lines, Math.min(24, Math.max(6, lines.length + 2)));
}

export async function runHighlightsCommand(ctx: CommandHandlerContext, _args?: string): Promise<boolean> {
    showAgentConsoleHighlights(ctx);
    // Remember the acknowledgement so the next release can auto-show once.
    await ctx.persistSettings?.({ highlightsSeenVersion: AGENT_CONSOLE_HIGHLIGHTS_VERSION }).catch(() => undefined);
    return true;
}

/**
 * Auto-show once per version. Users upgrading from a build that never had the
 * feature have no `highlightsSeenVersion`; they are not interrupted and can
 * still run `/highlights` (which records the version).
 */
export async function maybeShowHighlights(
    host: AgentConsoleHighlightsHost,
    persisted: { highlights?: boolean; highlightsSeenVersion?: string } | null | undefined
): Promise<void> {
    if (!persisted || persisted.highlights === false) {
        return;
    }
    const seen = String(persisted.highlightsSeenVersion || '').trim();
    if (!seen || seen === AGENT_CONSOLE_HIGHLIGHTS_VERSION) {
        return;
    }
    showAgentConsoleHighlights(host);
    await host.persistSettings?.({ highlightsSeenVersion: AGENT_CONSOLE_HIGHLIGHTS_VERSION }).catch(() => undefined);
}
