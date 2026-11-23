import { formatAgentUiDateTime, formatAgentUiLabel, formatAgentUiNotice, type AgentUiTranslator } from './agent-ui.i18n';
import { formatAgentConsoleApprovalInput } from './AgentConsoleApprovalInput';
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
    const selected = await host.select(formatAgentUiNotice(host.translator, 'approveRetryTitle'), actions.map((item: any) => {
        const input = formatAgentConsoleApprovalInput(item.toolName, item.inputSummary);
        return {
            label: `${item.toolName}${input ? ` · ${input}` : ''}`,
            value: String(item.evidenceId || `${item.toolName}:${item.createdAt}`),
            description: String(item.falsificationReason || '')
        };
    }), 0, formatAgentUiLabel(host.translator, 'agent.hint.enterRetryClose', 'enter retry once   esc close'));
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

function writeQueue(host: AgentConsoleRpcCommandHost, queue: Array<{ command?: boolean; input: string; attachments: any[] }>): void {
    if (queue.length) {
        host.queuedPrompts.set(host.state.sessionId, queue);
    } else {
        host.queuedPrompts.delete(host.state.sessionId);
    }
    host.state.setQueuedPromptCount(queue.length);
}

/**
 * Interactive queue panel: pick an entry, then edit/remove/move it.
 * Uses the existing select overlay, so it works identically in TUI and web.
 */
export async function runQueueManage(host: AgentConsoleRpcCommandHost): Promise<void> {
    const queue = [...(host.queuedPrompts.get(host.state.sessionId) || [])];
    if (!queue.length) {
        host.notify(formatAgentUiNotice(host.translator, 'noQueuedPrompts'));
        return;
    }
    const options = queue.map((entry, index) => ({
        label: `${index + 1}. ${entry.command ? formatAgentUiNotice(host.translator, 'queuedCommandBadge') : ''}${entry.input}`,
        value: String(index),
        description: entry.attachments.length
            ? formatAgentUiNotice(host.translator, entry.attachments.length === 1 ? 'queuedAttachmentSuffix' : 'queuedAttachmentsSuffix', { count: entry.attachments.length })
            : undefined
    }));
    const picked = await host.select(
        formatAgentUiNotice(host.translator, 'queueManageTitle'),
        options,
        0,
        formatAgentUiNotice(host.translator, 'queueManageHint')
    );
    const index = Number(picked);
    if (picked === undefined || !Number.isInteger(index) || index < 0 || index >= queue.length) {
        return;
    }
    const action = await host.select(
        formatAgentUiNotice(host.translator, 'queueActionTitle'),
        [
            { label: formatAgentUiNotice(host.translator, 'queueActionEdit'), value: 'edit' },
            { label: formatAgentUiNotice(host.translator, 'queueActionMoveUp'), value: 'up' },
            { label: formatAgentUiNotice(host.translator, 'queueActionMoveDown'), value: 'down' },
            { label: formatAgentUiNotice(host.translator, 'queueActionRemove'), value: 'remove' }
        ],
        0,
        formatAgentUiNotice(host.translator, 'queueActionHint')
    );
    if (!action) {
        return;
    }
    if (action === 'edit') {
        const [entry] = queue.splice(index, 1);
        writeQueue(host, queue);
        host.state.setInput(entry.input, entry.input.length);
        host.state.setPendingAttachments((entry.attachments || []).slice());
        host.state.refreshInputSuggestions?.();
        host.notify(formatAgentUiNotice(host.translator, 'queueEditLoaded', { index: index + 1 }));
        return;
    }
    if (action === 'remove') {
        queue.splice(index, 1);
        writeQueue(host, queue);
        host.notify(formatAgentUiNotice(host.translator, 'queueRemoved', { index: index + 1 }));
        return;
    }
    const target = action === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= queue.length) {
        host.notify(formatAgentUiNotice(host.translator, 'queueMoveEdge', {
            edge: formatAgentUiNotice(host.translator, action === 'up' ? 'queueEdgeTop' : 'queueEdgeBottom')
        }));
        return;
    }
    const [entry] = queue.splice(index, 1);
    queue.splice(target, 0, entry);
    writeQueue(host, queue);
    host.notify(formatAgentUiNotice(host.translator, 'queueMoved', { from: index + 1, to: target + 1 }));
}

export async function runQueueCommand(host: AgentConsoleRpcCommandHost, args?: string): Promise<boolean> {
    const parsed = String(args || '').trim();
    const queue = host.queuedPrompts.get(host.state.sessionId) || [];
    if (!parsed || parsed.toLowerCase() === 'list') {        if (!queue.length) {
            host.notify(formatAgentUiNotice(host.translator, 'noQueuedPrompts'));
            return true;
        }
        const lines = queue.map((entry, index) =>
            `${index + 1}. ${entry.command ? formatAgentUiNotice(host.translator, 'queuedCommandBadge') : ''}${entry.input}${entry.attachments.length
                ? formatAgentUiNotice(host.translator, entry.attachments.length === 1 ? 'queuedAttachmentSuffix' : 'queuedAttachmentsSuffix', { count: entry.attachments.length })
                : ''}`
        );
        host.pushCommandOutput('/queue list', `${formatAgentUiNotice(host.translator, 'queuedPromptsTitle', { count: queue.length })}\n${lines.join('\n')}`);
        return true;
    }
    if (parsed.toLowerCase() === 'manage') {
        await runQueueManage(host);
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
    const move = /^move\s+(\d+)\s+(\d+)$/i.exec(parsed);
    if (move) {
        const from = Number(move[1]) - 1;
        const to = Number(move[2]) - 1;
        if (!Number.isInteger(from) || from < 0 || from >= queue.length) {
            host.notify(formatAgentUiNotice(host.translator, 'queueEntryMissing', { index: move[1] }));
            return true;
        }
        if (!Number.isInteger(to) || to < 0 || to >= queue.length) {
            host.notify(formatAgentUiNotice(host.translator, 'queueEntryMissing', { index: move[2] }));
            return true;
        }
        if (from !== to) {
            const [entry] = queue.splice(from, 1);
            queue.splice(to, 0, entry);
            host.queuedPrompts.set(host.state.sessionId, queue);
            host.state.setQueuedPromptCount(queue.length);
        }
        host.notify(formatAgentUiNotice(host.translator, 'queueMoved', { from: from + 1, to: to + 1 }));
        return true;
    }
    const batch = /^remove\s+([\d,\s-]+)$/i.exec(parsed);
    if (batch && /[,-]/.test(batch[1])) {
        const indices = new Set<number>();
        for (const part of batch[1].split(',').map(item => item.trim()).filter(Boolean)) {
            const range = /^(\d+)(?:-(\d+))?$/.exec(part);
            if (!range) {
                host.notify(formatAgentUiNotice(host.translator, 'queueBatchInvalid', { value: part }));
                return true;
            }
            const start = Number(range[1]);
            const end = Number(range[2] || range[1]);
            if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
                host.notify(formatAgentUiNotice(host.translator, 'queueBatchInvalid', { value: part }));
                return true;
            }
            for (let index = start; index <= end; index++) {
                indices.add(index - 1);
            }
        }
        for (const index of indices) {
            if (index >= queue.length) {
                host.notify(formatAgentUiNotice(host.translator, 'queueEntryMissing', { index: String(index + 1) }));
                return true;
            }
        }
        for (const index of [...indices].sort((left, right) => right - left)) {
            queue.splice(index, 1);
        }
        if (queue.length) {
            host.queuedPrompts.set(host.state.sessionId, queue);
        } else {
            host.queuedPrompts.delete(host.state.sessionId);
        }
        host.state.setQueuedPromptCount(queue.length);
        host.notify(formatAgentUiNotice(host.translator, 'queueRemovedMany', { count: indices.size, queueLength: queue.length }));
        return true;
    }
    const manage = /^(remove|edit)\s+(\d+)$/i.exec(parsed);
    if (manage) {
        const index = Number(manage[2]) - 1;
        if (!Number.isInteger(index) || index < 0 || index >= queue.length) {
            host.notify(formatAgentUiNotice(host.translator, 'queueEntryMissing', { index: manage[2] }));
            return true;
        }
        const [entry] = queue.splice(index, 1);
        if (queue.length) {
            host.queuedPrompts.set(host.state.sessionId, queue);
        } else {
            host.queuedPrompts.delete(host.state.sessionId);
        }
        host.state.setQueuedPromptCount(queue.length);
        if (manage[1].toLowerCase() === 'edit') {
            // Move the queued prompt back into the composer so it can be
            // revised and sent again (removes it from the queue).
            host.state.setInput(entry.input, entry.input.length);
            host.state.setPendingAttachments((entry.attachments || []).slice());
            host.state.refreshInputSuggestions?.();
            host.notify(formatAgentUiNotice(host.translator, 'queueEditLoaded', { index: manage[2] }));
        } else {
            host.notify(formatAgentUiNotice(host.translator, 'queueRemoved', { index: manage[2] }));
        }
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
        const selected = await host.select(formatAgentUiNotice(host.translator, 'activeSharesTitle'), shares.map((share: any) => ({
            label: `${String(share.token || '').slice(0, 12)}…  ${String(share.url || '')}`,
            value: String(share.token || ''),
            description: formatAgentUiDateTime(Number(share.createdAt) || Date.now(), host.translator)
        })), 0, formatAgentUiLabel(host.translator, 'agent.hint.enterRevokeClose', 'enter revoke   esc close'));
        if (!selected) return true;
        return host.revokeShare(selected);
    }
    return host.revokeShare(token);
}
