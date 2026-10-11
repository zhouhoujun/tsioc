import { formatAgentUiNotice, type AgentUiTranslator } from './agent-ui.i18n';
import type { AgentConsoleSessionState } from './AgentConsoleSessionState';

export interface AgentConsoleRpcCommandHost {
    appRpc?: { request(method: string, params?: any, context?: any): Promise<any> } | null;
    state: AgentConsoleSessionState;
    runtime: { setPlanMode(sessionId: string, enabled: boolean): void };
    translator?: AgentUiTranslator | null;
    queuedPrompts: Map<string, Array<{ command?: boolean; input: string; attachments: any[] }>>;
    notify(message: string): void;
    select(title: string, options: any[], selectedIndex?: number, hint?: string): Promise<string | undefined>;
    pushCommandOutput(command: string, text: string): void;
    rpcRequestContext(requestId?: string): { requestId?: string; sessionEpoch: number; signal?: AbortSignal };
    revokeShare(token: string): Promise<boolean>;
}

export async function runApproveRetryCommand(host: AgentConsoleRpcCommandHost): Promise<boolean> {
    if (!host.appRpc) {
        host.notify(formatAgentUiNotice(host.translator, 'autoReviewRetry'));
        return true;
    }
    const result = await host.appRpc.request('harness.rejected_actions', { sessionId: host.state.sessionId }, host.rpcRequestContext())
        .catch(() => null);
    const actions = Array.isArray(result?.actions) ? result.actions : [];
    if (!actions.length) {
        host.notify(formatAgentUiNotice(host.translator, 'autoReviewRejected'));
        return true;
    }
    const action = actions[0];
    const selected = await host.select('Approve retry', actions.map((item: any) => ({
        label: `${item.toolName}${String(item.inputSummary || '').trim() ? ` · ${item.inputSummary}` : ''}`,
        value: String(item.evidenceId || `${item.toolName}:${item.createdAt}`),
        description: String(item.falsificationReason || '')
    })), 0, 'enter retry once   esc close');
    if (!selected) return true;
    try {
        await host.appRpc.request('harness.retry_rejected_action', {
            sessionId: host.state.sessionId,
            evidenceId: selected,
            toolName: action.toolName
        }, host.rpcRequestContext());
        host.notify(formatAgentUiNotice(host.translator, 'retriedOnceAfter', { toolName: action.toolName }));
    } catch (error: any) {
        host.notify(formatAgentUiNotice(host.translator, 'retryFailedError', { error: error?.message || String(error) }));
    }
    return true;
}

export async function runQueueCommand(host: AgentConsoleRpcCommandHost, args?: string): Promise<boolean> {
    const parsed = String(args || '').trim();
    const queue = host.queuedPrompts.get(host.state.sessionId) || [];
    if (!parsed || parsed.toLowerCase() === 'list') {
        if (!queue.length) {
            host.notify(formatAgentUiNotice(host.translator, 'noQueuedPrompts'));
            return true;
        }
        const lines = queue.map((entry, index) =>
            `${index + 1}. ${entry.command ? '[command] ' : ''}${entry.input}${entry.attachments.length ? ` (+${entry.attachments.length} attachment${entry.attachments.length === 1 ? '' : 's'})` : ''}`
        );
        host.pushCommandOutput('/queue list', `Queued prompts (${queue.length}):\n${lines.join('\n')}`);
        return true;
    }
    if (parsed.toLowerCase() === 'clear') {
        if (!queue.length) {
            host.notify(formatAgentUiNotice(host.translator, 'noQueuedPromptsClear'));
            return true;
        }
        host.queuedPrompts.delete(host.state.sessionId);
        host.state.setQueuedPromptCount(0);
        host.notify(formatAgentUiNotice(host.translator, 'clearedQueuedPrompts', { queueLength: queue.length, plural: queue.length === 1 ? '' : 's' }));
        return true;
    }
    host.notify(formatAgentUiNotice(host.translator, 'queueUsage'));
    return true;
}

export async function runMcpCommand(host: AgentConsoleRpcCommandHost, args?: string): Promise<boolean> {
    const verbose = String(args || '').trim().toLowerCase() === 'verbose'
        || String(args || '').trim().toLowerCase() === '-v';
    const servers = new Map<string, { tools: string[]; active: number }>();
    for (const tool of host.state.tools) {
        if (!tool.name.startsWith('mcp.')) continue;
        const parts = tool.name.split('.');
        const serverId = parts[1] || 'unknown';
        const entry = servers.get(serverId) || { tools: [], active: 0 };
        entry.tools.push(tool.name);
        if (tool.active) entry.active += 1;
        servers.set(serverId, entry);
    }
    if (!servers.size) {
        host.notify(formatAgentUiNotice(host.translator, 'noMcpServers'));
        return true;
    }
    const lines = Array.from(servers.entries()).map(([serverId, entry]) => {
        const summary = `${serverId} · ${entry.active}/${entry.tools.length} tools active`;
        return verbose
            ? `${summary}\n${entry.tools.map(name => `  ${name}`).join('\n')}`
            : summary;
    });
    host.pushCommandOutput('/mcp', lines.join('\n'));
    return true;
}

export async function runPlanCommand(host: AgentConsoleRpcCommandHost, args: string): Promise<void> {
    const sessionId = host.state.sessionId;
    const raw = String(args || '').trim().toLowerCase();
    let enabled: boolean;
    if (raw === 'on' || raw === '1' || raw === 'true') {
        enabled = true;
    } else if (raw === 'off' || raw === '0' || raw === 'false') {
        enabled = false;
    } else {
        enabled = !host.state.planMode;
    }
    try {
        if (host.appRpc) {
            await host.appRpc.request('session.plan_mode.set', { sessionId, enabled }, host.rpcRequestContext());
        } else {
            host.runtime.setPlanMode(sessionId, enabled);
        }
        host.state.setPlanMode(enabled);
        host.notify(enabled ? formatAgentUiNotice(host.translator, 'planModeEnabled') : formatAgentUiNotice(host.translator, 'planModeDisabled'));
    } catch (error) {
        host.notify(formatAgentUiNotice(host.translator, 'failedSetPlan', { error: error instanceof Error ? error.message : String(error) }));
    }
}

export async function runUnshareCommand(host: AgentConsoleRpcCommandHost, args?: string): Promise<boolean> {
    const token = String(args || '').trim();
    if (!host.appRpc) {
        host.notify(formatAgentUiNotice(host.translator, 'sharingRequiresGateway'));
        return true;
    }
    if (!token) {
        const shares = await host.appRpc.request('session.share.list', { sessionId: host.state.sessionId }, host.rpcRequestContext()).catch(() => []);
        if (!Array.isArray(shares) || !shares.length) {
            host.notify(formatAgentUiNotice(host.translator, 'activeSharesSession'));
            return true;
        }
        const selected = await host.select('Active shares', shares.map((share: any) => ({
            label: `${String(share.token || '').slice(0, 12)}…  ${String(share.url || '')}`,
            value: String(share.token || ''),
            description: new Date(Number(share.createdAt) || Date.now()).toLocaleString()
        })), 0, 'enter revoke   esc close');
        if (!selected) return true;
        return host.revokeShare(selected);
    }
    return host.revokeShare(token);
}
