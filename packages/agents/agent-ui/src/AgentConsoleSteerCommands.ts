import { formatAgentUiNotice, type AgentUiTranslator } from './agent-ui.i18n';

export interface AgentConsoleSteerHost {
    state: {
        sessionId?: string;
        steerMode?: boolean;
        pendingAttachments?: any[];
        setSteerMode(value: boolean): void;
        clearPendingAttachments?(): void;
    };
    translator?: AgentUiTranslator | null;
    notify(message: string): void;
    persistSettings(patch: Record<string, any>): Promise<any>;
    isTurnInProgress?(): boolean;
    appRpc?: { request(method: string, params?: any, context?: any): Promise<any> } | null;
    runtime?: { appendInboxItem?(sessionId: string, item: any): Promise<any> } | null;
    rpcRequestContext?(): any;
}

/**
 * `/steer [on|off]` — Enter during a running turn interrupts it and starts a new
 * turn (instead of queueing). Persisted as a workspace preference.
 */
export async function runSteerCommand(host: AgentConsoleSteerHost, args?: string): Promise<boolean> {
    const raw = String(args || '').trim();
    const parsed = raw.toLowerCase();
    if (raw && !['on', 'true', '1', 'off', 'false', '0'].includes(parsed)) {
        return submitSteer(host, raw);
    }
    let next: boolean;
    if (parsed === 'on' || parsed === 'true' || parsed === '1') {
        next = true;
    } else if (parsed === 'off' || parsed === 'false' || parsed === '0') {
        next = false;
    } else {
        next = host.state.steerMode !== true;
    }
    host.state.setSteerMode(next);
    host.notify(formatAgentUiNotice(host.translator, next ? 'steerEnabled' : 'steerDisabled'));
    try {
        await host.persistSettings({ steerMode: next });
    } catch (error: any) {
        host.notify(error?.message || formatAgentUiNotice(host.translator, 'steerSaveFailed'));
    }
    return true;
}

/** One-off steer: append a pending prompt consumed at the next step boundary. */
async function submitSteer(host: AgentConsoleSteerHost, text: string): Promise<boolean> {
    if (!host.isTurnInProgress?.()) {
        host.notify(formatAgentUiNotice(host.translator, 'steerRequiresTurn'));
        return true;
    }
    const item = {
        itemId: `steer-${Date.now()}`,
        kind: 'steer',
        state: 'queued',
        payload: {
            input: text,
            attachments: Array.isArray(host.state.pendingAttachments) ? host.state.pendingAttachments.slice() : [],
            command: false
        }
    };
    try {
        if (host.appRpc) {
            await host.appRpc.request('session.inbox.append', { sessionId: host.state.sessionId, item }, host.rpcRequestContext?.());
        } else if (host.runtime?.appendInboxItem && host.state.sessionId) {
            await host.runtime.appendInboxItem(host.state.sessionId, item);
        } else {
            host.notify(formatAgentUiNotice(host.translator, 'steerUnavailable'));
            return true;
        }
        host.state.clearPendingAttachments?.();
        host.notify(formatAgentUiNotice(host.translator, 'steerQueued'));
    } catch (error: any) {
        host.notify(error?.message || formatAgentUiNotice(host.translator, 'steerSaveFailed'));
    }
    return true;
}
