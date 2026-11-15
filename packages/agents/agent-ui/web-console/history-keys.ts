import type { AgentConsoleSessionState } from '@tsdi/agent-ui';

export interface AgentConsoleHistoryKeyHost {
    getState(): AgentConsoleSessionState;
    resolveFollower(): { page(direction: 1 | -1): boolean; atTop: boolean } | null;
    requestOlderMessages(): void;
}

/**
 * PageUp/PageDown page the viewport history like the TUI.
 *
 * Dialogs, focused panels and a non-empty draft keep their own keys. The event
 * is consumed whenever a transcript follower exists so the browser page itself
 * never jumps behind the fixed console shell.
 */
export function routeAgentConsoleHistoryKey(event: KeyboardEvent, host: AgentConsoleHistoryKeyHost): void {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) {
        return;
    }
    if (event.key !== 'PageUp' && event.key !== 'PageDown') {
        return;
    }
    const state = host.getState();
    if (state.textOverlay || state.selectMenu || state.pendingQuestion || state.approvalsFocused) {
        return;
    }
    if (state.focusLayers.isAnyFocusActive() && !state.messagesFocused) {
        return;
    }
    if (String(state.input || '').trim()) {
        return;
    }
    const follower = host.resolveFollower();
    if (!follower) {
        return;
    }
    event.preventDefault();
    follower.page(event.key === 'PageUp' ? -1 : 1);
    if (event.key === 'PageUp' && follower.atTop) {
        host.requestOlderMessages();
    }
}
