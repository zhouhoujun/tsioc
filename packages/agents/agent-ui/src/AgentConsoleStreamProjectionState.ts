import { applyNavFilter, compareCommandExchangeAsc, navigateCursor, normalizeThreadItemEvent, resolveNavSelection, sortTimelineEntries } from '@tsdi/agent';
import type { AgentMessage, CommandExchangeRecord, NavEntityType, NavFilter, NavSelection, NavTree, ThreadItemEvent, ThreadItemKind, ThreadItemStatus, TimelineEntry } from '@tsdi/agent';
import { formatAgentUiLabel } from './agent-ui.i18n';
import { projectTimelineContent } from './AgentConsoleTimelineProjection';
import { findTimelineLifecycleMessageIndex, isTerminalUiEventStatus, shouldApplyTimelineLifecycleUpdate } from './AgentConsoleTimelineLifecycle';
import type { AgentConsoleSessionState, AgentConsoleUiEventOptions } from './AgentConsoleSessionState';

export function toggleTimelineCollapse(state: AgentConsoleSessionState, scopeKey: string): void {
        const key = String(scopeKey || '').trim();
        if (!key || key === state.activeTurnEventScope) {
            return;
        }
        const next = { ...state.timelineCollapsedTurns };
        if (next[key]) {
            delete next[key];
        } else {
            next[key] = true;
        }
        state.timelineCollapsedTurns = next;
    }

export function qualifyUiEventKey(state: AgentConsoleSessionState, key: string): string {
        const resolvedKey = String(key || '').trim();
        if (!resolvedKey) {
            return '';
        }
        const scope = String(state.activeTurnEventScope || '').trim();
        return scope ? `${scope}:${resolvedKey}` : resolvedKey;
    }

export function withoutUiEventMessages(state: AgentConsoleSessionState, messages: AgentMessage[] = state.messages): AgentMessage[] {
        return messages.filter(message => message?.metadata?.uiKind !== 'event');
    }

export function clearUiEventMessages(state: AgentConsoleSessionState): void {
        const filtered = state.withoutUiEventMessages();
        if (filtered.length === state.messages.length) {
            return;
        }
        state.setMessages(filtered, true);
    }

export function removeUiEventMessage(state: AgentConsoleSessionState, eventKey: string): void {
        const key = String(eventKey || '').trim();
        if (!key) return;
        const filtered = state.messages.filter(message => message?.metadata?.uiKind !== 'event' || message?.metadata?.uiEventKey !== key);
        if (filtered.length !== state.messages.length) state.setMessages(filtered, true);
    }

export function seedTimeline(state: AgentConsoleSessionState, entries: TimelineEntry[]): void {
        let seedCount = 0;
        let changed = false;
        // Bulk history load: apply all entries in ONE render cycle instead of
        // one setMessages per entry (600 reactive cascades = minutes of sync
        // work). Replicates upsertUiEventMessage dedup on a working array.
        const pending = state.messages.slice();
        const eventIndexes = new Map<string, number>();
        pending.forEach((message, index) => {
            const eventKey = message?.metadata?.uiKind === 'event' ? message.metadata.uiEventKey : undefined;
            if (eventKey) eventIndexes.set(eventKey, index);
        });
        for (const entry of sortTimelineEntries(entries).filter(item => !item.sessionId || item.sessionId === state.sessionId)) {
            const key = state.qualifyUiEventKey(projectTimelineKey(entry));
            if (!key) {
                continue;
            }
            const options: AgentConsoleUiEventOptions = {
                eventType: entry.kind,
                label: entry.kind,
                status: entry.status === 'failed' ? 'error' : entry.status === 'running' ? 'running' : 'success',
                eventKey: key,
                durationMs: entry.durationMs,
                toolCallId: entry.toolCallId,
                receiptId: entry.receiptId,
                attempt: entry.attempt,
                source: 'remote',
                sequence: entry.sequence
            };
            const text = String(projectTimelineContent(entry, (key, fallback, params) =>
                formatAgentUiLabel(state.translator, `agent.menu.transcript.replay.${key}`, fallback, params)) || '').trim();
            if (text) {
                const existingIndex = eventIndexes.get(key);
                if (existingIndex !== undefined) {
                    const existing = pending[existingIndex];
                    const nextMessage = state.createUiEventMessage(text, {
                        ...options,
                        id: existing.id,
                        createdAt: existing.createdAt
                    });
                    if (!state.isSameUiEventMessage(existing, nextMessage)) {
                        pending[existingIndex] = nextMessage;
                        changed = true;
                    }
                } else {
                    pending.push(state.createUiEventMessage(text, options));
                    eventIndexes.set(key, pending.length - 1);
                    changed = true;
                }
            }
            seedCount += 1;
        }
        if (changed) {
            state.setMessages(pending, true);
        }
        if (seedCount > 0) {
            state.timelineSeedCount = seedCount;
        }
        if (entries.length) {
            state.timelineTailSeq = Math.max(...entries.map(entry => entry.lastSeq ?? -1));
        }
    }

export function seedCommandExchange(state: AgentConsoleSessionState, records: CommandExchangeRecord[]): void {
        const list = Array.isArray(records) ? records : [];
        if (!list.length) {
            return;
        }
        const ordered = list.filter(record => !record.sessionId || record.sessionId === state.sessionId).sort(compareCommandExchangeAsc);
        let seedCount = 0;
        const accepted: CommandExchangeRecord[] = [];
        for (const record of ordered) {
            if (record.sessionEpoch !== state.commandExchangeSessionEpoch) {
                continue;
            }
            accepted.push(record);
        }
        const commands = accepted.filter(record => toThreadItemKind(record.kind) === 'command');
        const others = accepted.filter(record => toThreadItemKind(record.kind) !== 'command');
        for (const record of [...others, ...commands]) {
            if (state.projectCommandExchangeRecord(record)) {
                seedCount += 1;
            }
        }
        if (seedCount > 0) {
            state.commandExchangeSeedCount = seedCount;
        }
        state.commandExchangeTailSeq = Math.max(ordered[ordered.length - 1].seq, state.commandExchangeTailSeq);
    }

export function projectCommandExchangeRecord(state: AgentConsoleSessionState, record: CommandExchangeRecord): boolean {
        const kind = toThreadItemKind(record.kind);
        const key = String(record.key || '').trim();
        if (!kind || !key) {
            return false;
        }
        const status = normalizeReplayStatus(record.status);
        state.projectThreadItem({
            kind,
            key,
            sessionId: record.sessionId || state.sessionId,
            content: record.content || record.command || 'Command',
            status,
            sequence: record.sequence,
            attempt: record.attempt,
            durationMs: record.durationMs,
            receiptId: record.receipt,
            toolCallId: record.toolCallId,
            command: record.command,
            args: record.args,
            outputIds: record.outputIds,
            error: record.error,
            retryable: record.retryable,
            source: 'replay'
        });
        return true;
    }

export function markTimelineReconnecting(state: AgentConsoleSessionState, reconnecting: boolean): void {
        state.timelineReconnecting = reconnecting;
        state.timelineStale = reconnecting;
    }

export function seedNavTree(state: AgentConsoleSessionState, tree: NavTree | null | undefined): void {
        if (!tree || !Array.isArray(tree.sessions)) {
            return;
        }
        state.navTree = tree;
        state.navSeedCount = tree.totalSessions ?? tree.sessions.length;
    }

export function setNavFilter(state: AgentConsoleSessionState, filter?: NavFilter): void {
        if (!filter) {
            state.navFilter = {};
        } else {
            const next: NavFilter = {};
            if (filter.text) {
                next.text = String(filter.text).trim();
            }
            if (filter.status) {
                next.status = filter.status;
            }
            if (filter.stage) {
                next.stage = filter.stage;
            }
            if (filter.workspace) {
                next.workspace = String(filter.workspace).trim();
            }
            if (filter.projectId) {
                next.projectId = String(filter.projectId).trim();
            }
            if (filter.threadId) {
                next.threadId = String(filter.threadId).trim();
            }
            if (filter.pinnedOnly) {
                next.pinnedOnly = true;
            }
            state.navFilter = next;
        }
        state.navSelection = state.resolveNavSelectionTarget();
    }

export function setNavSelection(state: AgentConsoleSessionState, selection?: NavSelection): void {
        if (!selection) {
            state.navSelection = undefined;
            return;
        }
        state.navSelection = { type: selection.type || 'session', id: selection.id, index: selection.index };
    }

export function navigateNav(state: AgentConsoleSessionState, direction: 'up' | 'down', type?: NavEntityType): NavSelection | undefined {
        if (!state.navTree) {
            return undefined;
        }
        const next = navigateCursor(state.navSelection, applyNavFilter(state.navTree, state.navFilter), direction, type);
        if (next) {
            state.navSelection = next;
        }
        return next;
    }

export function resolveNavSelectionTarget(state: AgentConsoleSessionState): NavSelection | undefined {
        if (!state.navTree) {
            return undefined;
        }
        const node = resolveNavSelection(state.navSelection, applyNavFilter(state.navTree, state.navFilter));
        if (!node) {
            return undefined;
        }
        return { type: node.type, id: node.id, index: state.navSelection?.index ?? -1 };
    }

export function setNavViewScroll(state: AgentConsoleSessionState, viewId: string, scroll: number): void {
        const key = String(viewId || '').trim();
        if (!key) {
            return;
        }
        state.navViewScroll = { ...state.navViewScroll, [key]: Math.max(0, Math.floor(Number(scroll) || 0)) };
    }

export function getNavViewScroll(state: AgentConsoleSessionState, viewId: string): number {
        const key = String(viewId || '').trim();
        if (!key) {
            return 0;
        }
        return state.navViewScroll[key] ?? 0;
    }

export function appendUiEventMessage(state: AgentConsoleSessionState, content: string, options: AgentConsoleUiEventOptions = {}): void {
        const text = String(content || '').trim();
        if (!text) {
            return;
        }
        const next = state.messages.slice();
        next.push(state.createUiEventMessage(text, options));
        state.setMessages(next, true);
    }

export function upsertUiEventMessage(state: AgentConsoleSessionState, eventKey: string, content: string, options: AgentConsoleUiEventOptions = {}): void {
        const text = String(content || '').trim();
        if (!text) {
            return;
        }
        const next = state.messages.slice();
        const existingIndex = findTimelineLifecycleMessageIndex(next, {
            eventKey,
            toolCallId: options.toolCallId,
            receiptId: options.receiptId
        });
        if (existingIndex >= 0) {
            const existing = next[existingIndex];
            if (!shouldApplyTimelineLifecycleUpdate(existing, options)) {
                return;
            }
            const resolvedOptions = state.resolveUiEventDurationFallback(existing, options);
            const nextMessage = state.createUiEventMessage(text, {
                ...resolvedOptions,
                eventKey,
                id: existing.id,
                createdAt: existing.createdAt
            });
            if (state.isSameUiEventMessage(existing, nextMessage)) {
                return;
            }
            next[existingIndex] = nextMessage;
        } else {
            next.push(state.createUiEventMessage(text, {
                ...options,
                eventKey
            }));
        }
        state.setMessages(next, true);
    }

export function resolveUiEventDurationFallback(state: AgentConsoleSessionState, existing: AgentMessage, incoming: AgentConsoleUiEventOptions): AgentConsoleUiEventOptions {
        if (incoming.durationMs != null) {
            return incoming;
        }
        const currentStatus = String(existing.metadata?.status || '');
        if (isTerminalUiEventStatus(currentStatus) && existing.metadata?.durationMs != null) {
            return { ...incoming, durationMs: existing.metadata.durationMs };
        }
        if (currentStatus !== 'running' || !isTerminalUiEventStatus(incoming.status)) {
            return incoming;
        }
        const startedAt = Number(existing.createdAt) || Date.now();
        return { ...incoming, durationMs: Math.max(0, Date.now() - startedAt) };
    }

export function projectThreadItem(state: AgentConsoleSessionState, event: ThreadItemEvent): void {
        const normalized = normalizeThreadItemEvent(event);
        if (!normalized.key || !normalized.content) return;
        if (normalized.kind === 'command') {
            const executionId = `__command_execution_${normalized.key}__`;
            const message: AgentMessage = {
                id: executionId,
                role: 'assistant',
                content: normalized.content,
                createdAt: Date.now(),
                metadata: {
                    uiKind: 'command-execution',
                    uiEventKey: normalized.key,
                    command: normalized.command,
                    args: normalized.args,
                    requestId: normalized.key,
                    status: normalized.status === 'success' ? 'succeeded' : normalized.status,
                    sequence: normalized.sequence,
                    attempt: normalized.attempt || 1,
                    outputIds: normalized.outputIds?.slice() || [],
                    error: normalized.error,
                    retryable: normalized.retryable
                }
            };
            const next = state.commandExecutionMessages.slice();
            const index = next.findIndex(item => item.id === executionId);
            if (index >= 0) next[index] = { ...message, createdAt: next[index].createdAt };
            else next.push(message);
            state.commandExecutionMessages = next;
            return;
        }
        state.upsertUiEventMessage(state.qualifyUiEventKey(normalized.key), normalized.content, {
            eventType: normalized.kind,
            label: normalized.kind,
            status: normalized.status === 'error' ? 'error' : normalized.status === 'success' ? 'success' : normalized.status === 'running' ? 'running' : undefined,
            eventKey: normalized.key,
            toolCallId: normalized.toolCallId,
            receiptId: normalized.receiptId,
            attempt: normalized.attempt,
            durationMs: normalized.durationMs,
            source: normalized.source === 'remote' ? 'remote' : 'local',
            sequence: normalized.sequence,
            category: normalized.category
        });
    }

export function appendAssistantErrorMessage(state: AgentConsoleSessionState, message: string): void {
        const text = String(message || '').trim();
        const currentMessages = state.messages.slice();
        while (currentMessages.length) {
            const lastMessage = currentMessages[currentMessages.length - 1];
            if (lastMessage?.role === 'assistant' && !String(lastMessage.content || '').trim()) {
                currentMessages.pop();
                continue;
            }
            break;
        }
        const lastMessage = currentMessages[currentMessages.length - 1];
        const nextContent = text ? `Error: ${text}` : 'Error';
        if (lastMessage?.role === 'assistant'
            && lastMessage?.metadata?.error
            && String(lastMessage.content || '').trim() === nextContent) {
            return;
        }
        currentMessages.push({
            id: `assistant-error-${Date.now()}`,
            role: 'assistant',
            content: nextContent,
            createdAt: Date.now(),
            metadata: {
                error: true
            }
        });
        state.setMessages(currentMessages, true);
    }

export function createUiEventMessage(state: AgentConsoleSessionState, content: string, options: AgentConsoleUiEventOptions = {}): AgentMessage {
        return {
            id: options.id || `ui-event-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
            role: 'assistant',
            content,
            createdAt: options.createdAt ?? Date.now(),
            metadata: {
                uiKind: 'event',
                uiEventType: options.eventType || 'state',
                uiEventLabel: options.label || 'state',
                uiEventKey: options.eventKey,
                durationMs: options.durationMs,
                status: options.status || 'running',
                category: options.category,
                timeline: {
                    source: options.source || 'local',
                    sequence: options.sequence,
                    toolCallId: options.toolCallId,
                    receiptId: options.receiptId,
                    attempt: options.attempt
                }
            }
        };
    }

export function isSameUiEventMessage(state: AgentConsoleSessionState, left: AgentMessage | undefined, right: AgentMessage | undefined): boolean {
        if (!left || !right) {
            return false;
        }
        const leftMetadata = left.metadata || {};
        const rightMetadata = right.metadata || {};
        return String(left.content || '').trim() === String(right.content || '').trim()
            && leftMetadata.uiKind === rightMetadata.uiKind
            && leftMetadata.uiEventType === rightMetadata.uiEventType
            && leftMetadata.uiEventLabel === rightMetadata.uiEventLabel
            && leftMetadata.uiEventKey === rightMetadata.uiEventKey
            && leftMetadata.durationMs === rightMetadata.durationMs
            && leftMetadata.status === rightMetadata.status
            && leftMetadata.category === rightMetadata.category
            && leftMetadata.timeline?.source === rightMetadata.timeline?.source
            && leftMetadata.timeline?.sequence === rightMetadata.timeline?.sequence
            && leftMetadata.timeline?.toolCallId === rightMetadata.timeline?.toolCallId
            && leftMetadata.timeline?.receiptId === rightMetadata.timeline?.receiptId
            && leftMetadata.timeline?.attempt === rightMetadata.timeline?.attempt;
    }

function projectTimelineKey(entry: TimelineEntry): string {
    return entry.key || `${entry.kind}:${entry.label}`;
}

const REPLAY_THREAD_KINDS: Record<string, ThreadItemKind | undefined> = {
    command: 'command',
    tool: 'tool',
    plan: 'plan'
};

function toThreadItemKind(kind: string): ThreadItemKind | undefined {
    return REPLAY_THREAD_KINDS[String(kind || '').trim()];
}

const REPLAY_STATUSES: Record<string, ThreadItemStatus | undefined> = {
    running: 'running',
    success: 'success',
    error: 'error',
    cancelled: 'cancelled',
    pending: 'pending'
};

function normalizeReplayStatus(status?: string): ThreadItemStatus | undefined {
    const value = String(status || '').trim();
    return REPLAY_STATUSES[value];
}
