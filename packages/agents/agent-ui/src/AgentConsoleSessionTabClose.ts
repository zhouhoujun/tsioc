import type { AgentConsoleSessionState } from './AgentConsoleSessionState';
import { AgentUiTranslator, formatAgentUiNotice } from './agent-ui.i18n';
import { resolveAgentConsoleSessionTabs } from './AgentConsoleSessionTabsSource';

export interface AgentConsoleSessionTabCloseHost {
    state: AgentConsoleSessionState;
    translator?: AgentUiTranslator | null;
    isTurnInProgress(): boolean;
    notifyBusyState(message: string): void;
    openSession(sessionId?: string): Promise<void>;
}

/**
 * Close a top-strip tab. Closing the active tab activates its previous
 * neighbour (else the next one); closing the last open tab starts a fresh
 * session. Closing any tab while its turn is running is refused so the running
 * transcript is never detached from the input.
 */
export async function closeAgentConsoleSessionTab(host: AgentConsoleSessionTabCloseHost, id: string): Promise<void> {
    const closingId = String(id || '').trim();
    if (!closingId) {
        return;
    }
    const state = host.state;
    if (closingId === state.sessionId && host.isTurnInProgress()) {
        host.notifyBusyState(formatAgentUiNotice(host.translator, 'sessionSwitchBusy'));
        return;
    }
    const tabs = resolveAgentConsoleSessionTabs(state);
    const index = tabs.findIndex(session => session.id === closingId);
    const remaining = tabs.filter(session => session.id !== closingId);
    state.setOpenSessionIds((state.openSessionIds || []).filter(openId => openId !== closingId));
    if (closingId !== state.sessionId) {
        return;
    }
    const neighbour = remaining[Math.max(0, index - 1)] || remaining[0];
    await host.openSession(neighbour?.id);
}
