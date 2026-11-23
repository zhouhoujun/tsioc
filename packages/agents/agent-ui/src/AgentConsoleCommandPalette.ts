import type { AgentConsoleSelectOption } from './AgentConsoleSessionState';
import { formatAgentUiLabel } from './agent-ui.i18n';
import { fuzzyMatchAgentConsoleCommand } from './AgentConsoleKeymap';
import {
    agentConsoleAllCommandHints,
    formatAgentConsoleCommandArgumentForm,
    formatAgentConsoleCommandArgumentTemplate,
    getAgentConsoleCommandDefinition,
    resolveAgentConsoleCommandDescription
} from './AgentConsoleCommandRegistry';

export interface AgentConsoleCommandPaletteHost {
    commandPaletteQuery: string;
    translator?: { translate(key: string, params?: Record<string, unknown>): string | undefined; currentLocale?: string } | null;
    state: {
        injectedCommandHints?: string[];
        recentCommands?: string[];
        openSelectMenu(title: string, options: AgentConsoleSelectOption[], selectedIndex?: number, hint?: string, kind?: string): void;
        selectMenuAction?: ((value: string | undefined) => void | Promise<void>) | undefined;
    };
    handleCommand(value: string): Promise<boolean>;
}

/**
 * Ctrl+P palette: the full non-hidden command catalogue (the `/` menu stays
 * curated) with recently executed commands first and fuzzy filtering.
 */
export function openCommandPaletteView(host: AgentConsoleCommandPaletteHost, query = ''): void {
    host.commandPaletteQuery = query;
    const translate = (key: string, params?: Record<string, any>, fallback?: string) => formatAgentUiLabel(host.translator, key, fallback ?? key, params);
    const paletteTitle = translate('agent.menu.panel.overlay.paletteTitle', undefined, 'Command palette');
    const catalogue = agentConsoleAllCommandHints(host.state.injectedCommandHints);
    const recents = query
        ? []
        : (host.state.recentCommands || []).filter(command => catalogue.includes(command));
    const ordered = [...recents, ...catalogue.filter(command => !recents.includes(command))];
    const commands = ordered
        .filter(command => fuzzyMatchAgentConsoleCommand(command, query))
        .map(command => {
            const definition = getAgentConsoleCommandDefinition(command);
            const form = formatAgentConsoleCommandArgumentForm(definition, translate);
            return {
                label: command,
                value: command,
                description: [
                    resolveAgentConsoleCommandDescription(
                        command,
                        undefined,
                        (key, fallback) => formatAgentUiLabel(host.translator, key, fallback)
                    ) || translate('agent.menu.panel.overlay.paletteCommandFallback', undefined, 'command'),
                    formatAgentConsoleCommandArgumentTemplate(definition)
                ].filter(Boolean).join(' '),
                detail: form.length ? form.join('\n') : undefined
            };
        });
    host.state.openSelectMenu(query ? `${paletteTitle}: ${query}` : paletteTitle, commands, 0, translate('agent.menu.panel.overlay.paletteHint', undefined, 'type to filter   enter execute'), 'palette');
    host.state.selectMenuAction = async value => {
        host.commandPaletteQuery = '';
        if (value) await host.handleCommand(value);
    };
}
