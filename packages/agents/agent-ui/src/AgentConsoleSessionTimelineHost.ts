import type {
    AgentMessage,
    AgentSessionSection,
    CommandExchangeRecord,
    NavEntityType,
    NavFilter,
    NavSelection,
    NavTree,
    ThreadItemEvent,
    TimelineEntry
} from '@tsdi/agent';
import type { AgentConsoleUiEventOptions } from './AgentConsoleStateTypes';
import type { TimelineWindowMessage } from './AgentConsoleTimelineWindow';
import { resolveDisplayMessages, resolveSessionFooter, resolveSessionHeader } from './AgentConsoleMessageProjection';
import { resolveFinalAssistantMessageId } from './AgentConsoleViewport';
import { appendMessageInState, mergeMessagesPageInState, setMessagesInState } from './AgentConsoleMessageState';
import {
    appendAssistantErrorMessage as appendAssistantErrorMessageInState,
    appendUiEventMessage as appendUiEventMessageInState,
    clearUiEventMessages as clearUiEventMessagesInState,
    createUiEventMessage as createUiEventMessageInState,
    getNavViewScroll as getNavViewScrollInState,
    isSameUiEventMessage as isSameUiEventMessageInState,
    markTimelineReconnecting as markTimelineReconnectingInState,
    navigateNav as navigateNavInState,
    projectCommandExchangeRecord as projectCommandExchangeRecordInState,
    projectThreadItem as projectThreadItemInState,
    qualifyUiEventKey as qualifyUiEventKeyInState,
    removeUiEventMessage as removeUiEventMessageInState,
    resolveNavSelectionTarget as resolveNavSelectionTargetInState,
    resolveUiEventDurationFallback as resolveUiEventDurationFallbackInState,
    seedCommandExchange as seedCommandExchangeInState,
    seedNavTree as seedNavTreeInState,
    seedTimeline as seedTimelineInState,
    setNavFilter as setNavFilterInState,
    setNavSelection as setNavSelectionInState,
    setNavViewScroll as setNavViewScrollInState,
    toggleTimelineCollapse as toggleTimelineCollapseInState,
    upsertUiEventMessage as upsertUiEventMessageInState,
    withoutUiEventMessages as withoutUiEventMessagesInState
} from './AgentConsoleStreamProjectionState';
import { AgentConsoleSessionOptionsHost } from './AgentConsoleSessionOptionsHost';
import type { AgentConsoleSessionState } from './AgentConsoleSessionState';

/** Message list, timeline projection and nav facade. */
export abstract class AgentConsoleSessionTimelineHost extends AgentConsoleSessionOptionsHost {
    protected abstract self(): AgentConsoleSessionState;

    get displayMessages(): AgentMessage[] { return resolveDisplayMessages(this.self()); }
    get sessionHeader(): TimelineWindowMessage | undefined { return resolveSessionHeader(this.self()); }
    get sessionFooter(): TimelineWindowMessage | undefined { return resolveSessionFooter(this.self()); }

    get finalAssistantMessageId(): string {
        return resolveFinalAssistantMessageId(this.messages);
    }

    /** Earliest session timestamp: first message createdAt → turn start → now. */

    setMessages(messages: AgentMessage[], preserveCommandExecutionMessages = false): void {
        setMessagesInState(this.self(), messages, preserveCommandExecutionMessages);
    }

    appendMessage(message: AgentMessage): void {
        appendMessageInState(this.self(), message);
    }

    setSections(sections: AgentSessionSection[]): void {
        this.sections = Array.isArray(sections) ? sections : [];
    }

    mergeMessagesPage(page: {
        messages: AgentMessage[];
        sections?: AgentSessionSection[];
        hasMore?: boolean;
        mode?: 'append' | 'prepend';
    }): void {
        mergeMessagesPageInState(this.self(), page);
    }

    beginTurnEventScope(scope?: string): string {
        this.activeTurnEventScope = String(scope || '').trim() || `turn-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
        return this.activeTurnEventScope;
    }

    clearTurnEventScope(scope?: string): void {
        const resolvedScope = String(scope || '').trim();
        if (!resolvedScope || this.activeTurnEventScope === resolvedScope) {
            this.activeTurnEventScope = '';
        }
    }

    /**
     * Derive the per-step elapsed time when a terminal event replaces a still-running
     * timeline row that carries no explicit duration. The replacement row preserves the
     * original start time (createdAt), so the processed duration is always available
     * for the timeline UI even when the incoming event has no receipt duration.
     */

    /** Shared cross-host projection entry point for transcript thread items. */

    toggleTimelineCollapse(scopeKey: string): void { toggleTimelineCollapseInState(this.self(), scopeKey); }
    qualifyUiEventKey(key: string): string { return qualifyUiEventKeyInState(this.self(), key); }
    withoutUiEventMessages(messages: AgentMessage[] = this.messages): AgentMessage[] { return withoutUiEventMessagesInState(this.self(), messages); }
    clearUiEventMessages(): void { clearUiEventMessagesInState(this.self()); }
    removeUiEventMessage(eventKey: string): void { removeUiEventMessageInState(this.self(), eventKey); }
    seedTimeline(entries: TimelineEntry[]): void { seedTimelineInState(this.self(), entries); }
    seedCommandExchange(records: CommandExchangeRecord[]): void { seedCommandExchangeInState(this.self(), records); }
    projectCommandExchangeRecord(record: CommandExchangeRecord): boolean { return projectCommandExchangeRecordInState(this.self(), record); }
    markTimelineReconnecting(reconnecting: boolean): void { markTimelineReconnectingInState(this.self(), reconnecting); }
    seedNavTree(tree: NavTree | null | undefined): void { seedNavTreeInState(this.self(), tree); }
    setNavFilter(filter?: NavFilter): void { setNavFilterInState(this.self(), filter); }
    setNavSelection(selection?: NavSelection): void { setNavSelectionInState(this.self(), selection); }
    navigateNav(direction: 'up' | 'down', type?: NavEntityType): NavSelection | undefined { return navigateNavInState(this.self(), direction, type); }
    resolveNavSelectionTarget(): NavSelection | undefined { return resolveNavSelectionTargetInState(this.self()); }
    setNavViewScroll(viewId: string, scroll: number): void { setNavViewScrollInState(this.self(), viewId, scroll); }
    getNavViewScroll(viewId: string): number { return getNavViewScrollInState(this.self(), viewId); }
    appendUiEventMessage(content: string, options: AgentConsoleUiEventOptions = {}): void { appendUiEventMessageInState(this.self(), content, options); }
    upsertUiEventMessage(eventKey: string, content: string, options: AgentConsoleUiEventOptions = {}): void { upsertUiEventMessageInState(this.self(), eventKey, content, options); }
    resolveUiEventDurationFallback(existing: AgentMessage, incoming: AgentConsoleUiEventOptions): AgentConsoleUiEventOptions { return resolveUiEventDurationFallbackInState(this.self(), existing, incoming); }
    projectThreadItem(event: ThreadItemEvent): void { projectThreadItemInState(this.self(), event); }
    appendAssistantErrorMessage(message: string): void { appendAssistantErrorMessageInState(this.self(), message); }
    createUiEventMessage(content: string, options: AgentConsoleUiEventOptions = {}): AgentMessage { return createUiEventMessageInState(this.self(), content, options); }
    isSameUiEventMessage(left: AgentMessage | undefined, right: AgentMessage | undefined): boolean { return isSameUiEventMessageInState(this.self(), left, right); }
}
