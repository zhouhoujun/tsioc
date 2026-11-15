import { formatAgentUiNotice, resolveAgentConsoleDialogRoute, type AgentUiTranslator } from '@tsdi/agent-ui';

export interface AgentConsoleDialogDeepLinkHost {
    /** Route name from `?dialog=`. */
    dialog: string;
    translator?: AgentUiTranslator | null;
    /** Dispatch the route's slash command through the console component. */
    handleCommand?: (command: string) => Promise<boolean>;
    /** Surface an unknown route without opening an empty dialog. */
    notify: (message: string) => void;
}

/**
 * Web `?dialog=<id|path|alias|prefix>` deep link.
 *
 * Resolves through the shared route table and dispatches the route's own
 * command, so the transcript records the dialog it opened rather than an
 * internal `/dialog` wrapper.
 */
export function openAgentConsoleDialogDeepLink(host: AgentConsoleDialogDeepLinkHost): void {
    const route = resolveAgentConsoleDialogRoute(host.dialog);
    if (!route) {
        host.notify(formatAgentUiNotice(host.translator, 'dialogRouteUnknown', { route: host.dialog }));
        return;
    }
    Promise.resolve(host.handleCommand?.(route.command)).catch(() => undefined);
}
