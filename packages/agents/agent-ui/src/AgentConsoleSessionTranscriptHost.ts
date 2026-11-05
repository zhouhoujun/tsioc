import type { AgentMessage } from '@tsdi/agent';
import type { AgentConsoleFocusLayers } from './AgentConsoleFocusLayers';
import { AgentConsoleSessionListHost } from './AgentConsoleSessionListHost';
import type { AgentConsoleSessionState } from './AgentConsoleSessionState';
import {
    closeMessageDetail as closeMessageDetailInState,
    isMessageExpanded as isMessageExpandedInState,
    openMessageDetail as openMessageDetailInState,
    resolveMessageDetailLines,
    resolveMessageDetailMaxColumn,
    scrollMessageDetail as scrollMessageDetailInState,
    scrollMessageDetailColumns as scrollMessageDetailColumnsInState,
    scrollMessageDetailColumnsToEdge as scrollMessageDetailColumnsToEdgeInState,
    scrollMessageDetailPage as scrollMessageDetailPageInState,
    scrollMessageDetailToEdge as scrollMessageDetailToEdgeInState,
    setMessageExpanded as setMessageExpandedInState,
    toggleMessageExpanded as toggleMessageExpandedInState,
    toggleSelectedMessageExpanded as toggleSelectedMessageExpandedInState
} from './AgentConsoleMessageDetailState';
import {
    buildTimelineEventRetryPayload as buildTimelineEventRetryPayloadInState,
    canRetryTimelineEvent as canRetryTimelineEventInState,
    closeTimelineEventInspector as closeTimelineEventInspectorInState,
    formatDuration as formatDurationInState,
    isFailedEventMessage as isFailedEventMessageInState,
    isTimelineEventMessage as isTimelineEventMessageInState,
    openTimelineEventInspector as openTimelineEventInspectorInState,
    resolveTimelineEventDetailLines,
    resolveTimelineEventDetailMaxColumn,
    scrollTimelineEventDetail as scrollTimelineEventDetailInState,
    scrollTimelineEventDetailColumns as scrollTimelineEventDetailColumnsInState,
    scrollTimelineEventDetailColumnsToEdge as scrollTimelineEventDetailColumnsToEdgeInState,
    scrollTimelineEventDetailPage as scrollTimelineEventDetailPageInState,
    scrollTimelineEventDetailToEdge as scrollTimelineEventDetailToEdgeInState
} from './AgentConsoleTimelineInspector';

/** Message selection, detail and timeline inspector projection facade. */
export abstract class AgentConsoleSessionTranscriptHost extends AgentConsoleSessionListHost {
    protected abstract self(): AgentConsoleSessionState;
    abstract readonly focusLayers: AgentConsoleFocusLayers;
    abstract get displayMessages(): AgentMessage[];
    abstract syncDerivedInputFocus(): void;

    setSelectedMessageId(messageId: string): void {
        if (!messageId || !this.displayMessages.some(item => item.id === messageId)) {
            return;
        }
        this.selectedMessageId = messageId;
        this.messageDetailScroll = 0;
        this.messageDetailColumnScroll = 0;
    }

    isPlanTodoMessageSelected(): boolean {
        return this.selectedMessageId === '__plan_todo_inline__' && this.planTodos.length > 7;
    }

    focusLatestLongMessage(): boolean {
        if (this.input || this.inputLocked || this.modalPromptActive || this.focusLayers.hasBlockingSelectMenu()) {
            return false;
        }
        const messages = this.displayMessages;
        for (let index = messages.length - 1; index >= 0; index -= 1) {
            const message = messages[index];
            const content = String(message.content || '');
            if (content.split('\n').length > 8 || content.length > 800) {
                this.selectedMessageId = message.id;
                this.messageDetailOpen = false;
                this.messagesFocused = true;
                this.syncDerivedInputFocus();
                return true;
            }
        }
        if (!messages.length) {
            return false;
        }
        this.selectedMessageId = messages[messages.length - 1].id;
        this.messageDetailOpen = false;
        this.messagesFocused = true;
        this.syncDerivedInputFocus();
        return true;
    }

    get selectedMessage(): AgentMessage | undefined {
        return this.displayMessages.find(item => item.id === this.selectedMessageId);
    }

    get selectedTimelineEvent(): AgentMessage | undefined {
        if (!this.selectedTimelineEventId) {
            return undefined;
        }
        return this.displayMessages.find(item => item.id === this.selectedTimelineEventId);
    }

    /** Host hook: fetch one tool call's raw payload on demand (optional). */
    toolPayloadLoader?: (toolCallId: string) => Promise<string | undefined>;

    /** Raw payload shown in the event inspector (empty until the host answers). */
    timelineEventOutput = '';
    timelineEventOutputLoading = false;

    get hasTimelineEventInspectorFocus(): boolean {
        return !!this.timelineEventInspectorOpen;
    }

    isTimelineEventMessage(message?: AgentMessage | null): boolean { return isTimelineEventMessageInState(this.self(), message); }
    isFailedEventMessage(message?: AgentMessage | null): boolean { return isFailedEventMessageInState(this.self(), message); }
    openTimelineEventInspector(eventMessage?: AgentMessage): void { openTimelineEventInspectorInState(this.self(), eventMessage); }
    closeTimelineEventInspector(): void { closeTimelineEventInspectorInState(this.self()); }
    get timelineEventDetailLines(): string[] { return resolveTimelineEventDetailLines(this.self()); }
    get timelineEventDetailMaxColumn(): number { return resolveTimelineEventDetailMaxColumn(this.self()); }
    formatDuration(ms: number): string { return formatDurationInState(ms); }
    scrollTimelineEventDetail(delta: number): void { scrollTimelineEventDetailInState(this.self(), delta); }
    scrollTimelineEventDetailPage(delta: number, pageSize?: number): void { scrollTimelineEventDetailPageInState(this.self(), delta, pageSize); }
    scrollTimelineEventDetailToEdge(position: 'start' | 'end'): void { scrollTimelineEventDetailToEdgeInState(this.self(), position); }
    scrollTimelineEventDetailColumns(delta: number): void { scrollTimelineEventDetailColumnsInState(this.self(), delta); }
    scrollTimelineEventDetailColumnsToEdge(position: 'start' | 'end'): void { scrollTimelineEventDetailColumnsToEdgeInState(this.self(), position); }
    canRetryTimelineEvent(): boolean { return canRetryTimelineEventInState(this.self()); }
    buildTimelineEventRetryPayload(): { toolCallId?: string; receiptId?: string; attempt?: number; uiEventKey?: string } | null { return buildTimelineEventRetryPayloadInState(this.self()); }

    isMessageExpanded(messageId: string): boolean { return isMessageExpandedInState(this.self(), messageId); }
    setMessageExpanded(messageId: string, expanded: boolean): void { setMessageExpandedInState(this.self(), messageId, expanded); }
    toggleMessageExpanded(messageId: string): void { toggleMessageExpandedInState(this.self(), messageId); }
    toggleSelectedMessageExpanded(): boolean { return toggleSelectedMessageExpandedInState(this.self()); }
    openMessageDetail(takeFocus = true): void { openMessageDetailInState(this.self(), takeFocus); }
    closeMessageDetail(): void { closeMessageDetailInState(this.self()); }
    scrollMessageDetail(delta: number): void { scrollMessageDetailInState(this.self(), delta); }
    scrollMessageDetailPage(delta: number, pageSize?: number): void { scrollMessageDetailPageInState(this.self(), delta, pageSize); }
    scrollMessageDetailToEdge(position: 'start' | 'end'): void { scrollMessageDetailToEdgeInState(this.self(), position); }
    get messageDetailLines(): string[] { return resolveMessageDetailLines(this.self()); }
    get messageDetailMaxColumn(): number { return resolveMessageDetailMaxColumn(this.self()); }
    scrollMessageDetailColumns(delta: number): void { scrollMessageDetailColumnsInState(this.self(), delta); }
    scrollMessageDetailColumnsToEdge(position: 'start' | 'end'): void { scrollMessageDetailColumnsToEdgeInState(this.self(), position); }
}
