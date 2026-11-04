import type { AgentMessage } from '@tsdi/agent';
import type { AgentConsoleSessionState } from './AgentConsoleSessionState';
import { DEFAULT_TIMELINE_LABELS } from './AgentConsoleTimelineWindow';
import { formatTimelineEventInspectorLines } from './AgentConsoleTimelineEventInspector';

export function isTimelineEventMessage(state: AgentConsoleSessionState, message?: AgentMessage | null): boolean {
        if (!message) {
            return false;
        }
        const metadata = message.metadata || {};
        if (metadata.uiKind !== 'event') {
            return false;
        }        return metadata.uiEventType === 'tool_invoked'
            || metadata.uiEventType === 'tool_completed'
            || metadata.uiEventType === 'tool_failed'
            || metadata.uiEventType === 'plan_step_failed'
            || metadata.uiEventType === 'plan_step_blocked'
            || metadata.uiEventType === 'approval'
            || metadata.uiEventType === 'approval_request';
    }

export function isFailedEventMessage(state: AgentConsoleSessionState, message?: AgentMessage | null): boolean {
        if (!state.isTimelineEventMessage(message)) {
            return false;
        }
        const metadata = message!.metadata || {};
        const status = String(metadata.status || '').toLowerCase();
        return metadata.error === true
            || status === 'failed'
            || status === 'error'
            || status === 'blocked';
    }

export function openTimelineEventInspector(state: AgentConsoleSessionState, eventMessage?: AgentMessage): void {
        const target = eventMessage || state.selectedMessage;
        if (!target || !state.isTimelineEventMessage(target)) {
            return;
        }
        state.selectedTimelineEventId = target.id;
        state.timelineEventInspectorOpen = true;
        state.timelineEventDetailScroll = 0;
        state.timelineEventDetailColumnScroll = 0;
        state.timelineEventOutput = '';
        state.timelineEventOutputLoading = false;
        const toolCallId = String(target.metadata?.timeline?.toolCallId || target.metadata?.receipt?.toolCallId || '').trim();
        if (toolCallId && state.toolPayloadLoader) {
            state.timelineEventOutputLoading = true;
            void state.toolPayloadLoader(toolCallId)
                .then(text => {
                    if (state.selectedTimelineEventId !== target.id) {
                        return;
                    }
                    state.timelineEventOutput = String(text || '');
                })
                .catch(() => undefined)
                .then(() => {
                    if (state.selectedTimelineEventId === target.id) {
                        state.timelineEventOutputLoading = false;
                    }
                });
        }
        state.syncDerivedInputFocus();
    }

export function closeTimelineEventInspector(state: AgentConsoleSessionState): void {
        if (!state.timelineEventInspectorOpen) {
            return;
        }
        state.timelineEventInspectorOpen = false;
        state.selectedTimelineEventId = '';
        state.timelineEventDetailScroll = 0;
        state.timelineEventDetailColumnScroll = 0;
        state.syncDerivedInputFocus();
    }

export function formatDuration(ms: number): string {
        if (ms < 1000) {
            return `${ms}ms`;
        }
        const s = ms / 1000;
        if (s < 60) {
            return `${s.toFixed(1)}s`;
        }
        const m = Math.floor(s / 60);
        const rem = s - m * 60;
        return `${m}m ${rem.toFixed(0)}s`;
    }

export function scrollTimelineEventDetail(state: AgentConsoleSessionState, delta: number): void {
        if (!state.timelineEventInspectorOpen) {
            return;
        }
        const lines = state.timelineEventDetailLines;
        const maxScroll = Math.max(0, lines.length - state.messageDetailVisibleLines);
        state.timelineEventDetailScroll = Math.max(0, Math.min(maxScroll, state.timelineEventDetailScroll + delta));
    }

export function scrollTimelineEventDetailPage(state: AgentConsoleSessionState, delta: number, pageSize?: number): void {
        if (!state.timelineEventInspectorOpen) {
            return;
        }
        const resolvedPageSize = pageSize ?? Math.max(1, state.messageDetailVisibleLines - 1);
        state.scrollTimelineEventDetail(delta * Math.max(1, resolvedPageSize));
    }

export function scrollTimelineEventDetailToEdge(state: AgentConsoleSessionState, position: 'start' | 'end'): void {
        if (!state.timelineEventInspectorOpen) {
            return;
        }
        const lines = state.timelineEventDetailLines;
        state.timelineEventDetailScroll = position === 'start'
            ? 0
            : Math.max(0, lines.length - state.messageDetailVisibleLines);
    }

export function scrollTimelineEventDetailColumns(state: AgentConsoleSessionState, delta: number): void {
        if (!state.timelineEventInspectorOpen) {
            return;
        }
        const maxScroll = Math.max(0, state.timelineEventDetailMaxColumn - 1);
        state.timelineEventDetailColumnScroll = Math.max(0, Math.min(maxScroll, state.timelineEventDetailColumnScroll + delta));
    }

export function scrollTimelineEventDetailColumnsToEdge(state: AgentConsoleSessionState, position: 'start' | 'end'): void {
        if (!state.timelineEventInspectorOpen) {
            return;
        }
        state.timelineEventDetailColumnScroll = position === 'start'
            ? 0
            : Math.max(0, state.timelineEventDetailMaxColumn - 1);
    }

export function canRetryTimelineEvent(state: AgentConsoleSessionState): boolean {
        if (!state.timelineEventInspectorOpen) {
            return false;
        }
        const event = state.selectedTimelineEvent;
        if (!event) {
            return false;
        }
        return event.metadata?.uiEventType === 'tool_failed'
            || event.metadata?.status === 'error'
            || event.metadata?.status === 'failed';
    }

export function buildTimelineEventRetryPayload(state: AgentConsoleSessionState): { toolCallId?: string; receiptId?: string; attempt?: number; uiEventKey?: string } | null {
        const event = state.selectedTimelineEvent;
        if (!event) {
            return null;
        }
        const m = event.metadata || {};
        return {
            toolCallId: m.timeline?.toolCallId,
            receiptId: m.timeline?.receiptId,
            attempt: m.timeline?.attempt,
            uiEventKey: m.uiEventKey
        };
    }

export function resolveTimelineEventDetailLines(state: AgentConsoleSessionState): string[] {
        return formatTimelineEventInspectorLines({
            event: state.selectedTimelineEvent,
            output: state.timelineEventOutput,
            outputLoading: state.timelineEventOutputLoading,
            labels: { ...DEFAULT_TIMELINE_LABELS, ...(state.consoleOptions.timelineLabels || {}) },
            translate: (key, params, fallback) => state.translateLabel(key, params, fallback),
            formatDuration: ms => state.formatDuration(ms)
        });
    }

export function resolveTimelineEventDetailMaxColumn(state: AgentConsoleSessionState): number {
        return state.timelineEventDetailLines.reduce((max, line) => Math.max(max, line.length), 0);
    }
