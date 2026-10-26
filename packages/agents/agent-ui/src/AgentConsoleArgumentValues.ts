import { agentConsoleThemeNames } from './AgentConsoleTheme';
import type { AgentConsoleSelectOption, AgentConsoleSessionItem, AgentConsoleToolItem } from './AgentConsoleSessionState';
import type { AgentConsoleMentionCatalogItem } from './AgentConsoleWorkspaceMentions';

/**
 * Argument candidates that only the live console knows about.
 *
 * The registry can only declare static values; tool names, recent sessions,
 * builtin themes and the skill/plugin catalog are runtime data. Kept out of
 * `AgentConsoleSessionState` (which is at its source-size ratchet) as a pure
 * function over the few fields it needs.
 */
export interface DynamicArgumentHost {
    tools?: AgentConsoleToolItem[];
    sessions?: AgentConsoleSessionItem[];
    mentionCatalog?: AgentConsoleMentionCatalogItem[];
}

export function resolveDynamicArgumentValues(
    host: DynamicArgumentHost,
    command: string,
    index: number,
    token = ''
): AgentConsoleSelectOption[] | undefined {
    if (index !== 0) {
        return undefined;
    }
    const needle = String(token || '').toLowerCase();
    const matches = (option: AgentConsoleSelectOption): boolean => !needle
        || String(option.value || '').toLowerCase().startsWith(needle)
        || String(option.label || '').toLowerCase().startsWith(needle);
    const pick = (options: AgentConsoleSelectOption[]): AgentConsoleSelectOption[] => options.filter(matches);
    switch (String(command || '').toLowerCase()) {
        case '/tools':
            // Inactive tools are still valid `/tools <name>` arguments (the
            // command inspects a tool by name), so do not filter them out.
            return pick((host.tools || [])
                .map(tool => ({ label: tool.name, value: tool.name, description: tool.toolset })));
        case '/session':
            return pick((host.sessions || [])
                .filter(session => !session.archived)
                .slice(0, 20)
                .map(session => ({
                    label: session.title || session.id,
                    value: session.id,
                    description: session.summary || session.workspace
                })));
        case '/theme':
            return pick(agentConsoleThemeNames.map(name => ({ label: name, value: name })));
        case '/skills':
            return pick((host.mentionCatalog || [])
                .filter(item => item.kind === 'skill')
                .map(item => ({ label: item.title || item.id, value: item.id, description: item.description })));
        case '/plugins':
            return pick((host.mentionCatalog || [])
                .filter(item => item.kind === 'plugin')
                .map(item => ({ label: item.title || item.id, value: item.id, description: item.description })));
        default:
            return undefined;
    }
}
