import type { AgentMessage, AgentSessionSection } from '@tsdi/agent';
import { batchReactiveUpdates } from '@tsdi/components';
import type { AgentConsolePendingAttachment, AgentConsoleSessionState } from './AgentConsoleSessionState';
import type { AgentConsolePlanTodoItem } from './AgentConsoleStateTypes';
import type { ConsoleTerminalSurfaceAccessor } from './console-ports';

/** Everything a session tab owns in the TUI, captured when leaving it. */
export interface AgentConsoleSessionUiSnapshot {
    /** Scroll distance from the latest row (stable when rows appear above). */
    scrollOffset: number;
    scrollFollowing: boolean;
    newCount: number;
    input: string;
    inputCursor: number;
    attachments: AgentConsolePendingAttachment[];
    selectedMessageId: string;
    messagesFocused: boolean;
    messageDetailOpen: boolean;
    messageDetailScroll: number;
    /**
     * Cached transcript/projection for hide/show tab switching. Restoring this
     * makes a revisit paint the tab's own view immediately instead of blanking
     * and rebuilding it while the server refresh is in flight.
     */
    messages?: AgentMessage[];
    sections?: AgentSessionSection[];
    goalSummary?: any;
    messagesPageCursor?: string;
    messagesHasMore?: boolean;
    planTodos?: AgentConsolePlanTodoItem[];
    planTodoSourceSessionId?: string;
    planScope?: 'project' | 'thread' | '';
    pendingApprovals?: any[];
    status?: string;
    workspace?: string;
}

export interface AgentConsoleSessionUiStateHost {
    state: AgentConsoleSessionState;
    surfaceAccessor?: ConsoleTerminalSurfaceAccessor | null;
}

/**
 * Apply a restored tab draft through the console proxy. Raw `state.setInput()`
 * writes do not trigger the other components' effects, so the composer kept the
 * previous placeholder until an unrelated render.
 */
export function applyAgentConsoleSessionComposer(
    host: { state: AgentConsoleSessionState },
    input: string,
    cursor: number,
    attachments: AgentConsolePendingAttachment[]
): void {
    host.state.input = input;
    host.state.inputCursor = cursor;
    host.state.pendingAttachments = attachments;
    host.state.refreshInputSuggestions();
    host.state.syncDerivedInputFocus();
}

/**
 * Each session tab behaves like its own agent TUI: scroll position, composer
 * draft/attachments, message selection and detail view are saved when leaving a
 * tab and restored when returning to it. Server-backed data (messages, plan,
 * approvals, tools) is reloaded per session by the session-open path.
 */
export class AgentConsoleSessionUiState {
    protected readonly snapshots = new Map<string, AgentConsoleSessionUiSnapshot>();
    /** State proxy captured from the owning component method (reactive writes). */
    protected boundState?: AgentConsoleSessionState;

    constructor(protected readonly host: () => AgentConsoleSessionUiStateHost) {
    }

    /**
     * Bind the owning component's reactive state proxy. Field-initializer host
     * lambdas capture the raw constructor instance, so writes through them do
     * not notify other components; component methods must bind the proxy first.
     */
    bindState(state: AgentConsoleSessionState): void {
        this.boundState = state;
    }

    protected resolveHost(): AgentConsoleSessionUiStateHost {
        const host = this.host();
        return this.boundState ? { ...host, state: this.boundState } : host;
    }

    /** Save the outgoing tab's UI state (no-op for an empty session id). */
    capture(sessionId?: string): void {
        const id = String(sessionId || '').trim();
        if (!id) {
            return;
        }
        const { state, surfaceAccessor } = this.resolveHost();
        const offset = surfaceAccessor?.getViewportScrollOffset?.();
        this.snapshots.set(id, {
            scrollOffset: typeof offset === 'number' && Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0,
            scrollFollowing: surfaceAccessor?.isViewportFollowing?.() !== false,
            newCount: state.messagesNewCount,
            input: state.input,
            inputCursor: state.inputCursor,
            attachments: (state.pendingAttachments || []).slice(),
            selectedMessageId: state.selectedMessageId,
            messagesFocused: state.messagesFocused,
            messageDetailOpen: state.messageDetailOpen,
            messageDetailScroll: state.messageDetailScroll,
            messages: state.messages,
            sections: state.sections,
            goalSummary: state.goalSummary,
            messagesPageCursor: state.messagesPageCursor,
            messagesHasMore: state.messagesHasMore,
            planTodos: (state.planTodos || []).slice(),
            planTodoSourceSessionId: state.planTodoSourceSessionId,
            planScope: state.planScope,
            pendingApprovals: (state.pendingApprovals || []).slice(),
            status: state.status,
            workspace: state.workspace
        });
    }

    /** Restore the incoming tab's UI state; a first visit starts empty/following. */
    restore(
        sessionId: string,
        applyComposer?: (input: string, cursor: number, attachments: AgentConsolePendingAttachment[]) => void
    ): void {
        const id = String(sessionId || '').trim();
        if (!id) {
            return;
        }
        const { state, surfaceAccessor } = this.resolveHost();
        const saved = this.snapshots.get(id);
        this.restoreComposer(state, saved, applyComposer);
        // The composer value is restored outside any DOM dirty origin; cached
        // panel layouts would otherwise repaint the previous placeholder/value.
        surfaceAccessor?.invalidateRenderCache?.();
        this.restoreMessageSelection(state, saved);
        this.restoreViewport(state, surfaceAccessor, id, saved);
    }

    forget(sessionId?: string): void {
        const id = String(sessionId || '').trim();
        if (id) {
            this.snapshots.delete(id);
        }
    }

    /**
     * Run a tab switch as one isolated transaction: save the outgoing tab,
     * coalesce the intermediate renders, load the target, and restore the target
     * tab's own UI state after its first frame has rendered.
     */
    async switchSession(
        open: (cached?: AgentConsoleSessionUiSnapshot) => Promise<void>,
        currentSessionId: () => string,
        begin: () => void = () => undefined,
        end: () => void = () => undefined,
        applyComposer?: (input: string, cursor: number, attachments: AgentConsolePendingAttachment[]) => void,
        targetSessionId?: string
    ): Promise<void> {
        const previousSessionId = currentSessionId();
        this.capture(previousSessionId);
        const targetId = String(targetSessionId || '').trim();
        const cached = targetId ? this.snapshots.get(targetId) : undefined;
        const showingCached = !!cached?.messages;
        if (cached?.messages) {
            // Hide/show semantics: paint the target tab's cached view before
            // awaiting the background refresh. Let the reactive bindings and
            // the surface microtask run so the cached frame is visible before
            // any slow refresh query; the refresh only replaces rows that
            // actually changed, so revisiting a tab does not blank and rebuild
            // the transcript.
            this.applyCachedView(targetId, cached, applyComposer);
            for (let turn = 0; turn < 4; turn += 1) {
                await Promise.resolve();
            }
        }
        // A cached switch is a no-op paint until the refresh lands; keeping a
        // render batch open would freeze typing and tab feedback for the whole
        // refresh. Only first visits coalesce their empty->loaded transition.
        if (!showingCached) {
            begin();
        }
        try {
            await open(cached);
        } finally {
            const targetSessionId = currentSessionId();
            // Startup (no previous tab) must not restore: the session-open path
            // already cleared the composer, and an early keystroke must not be
            // wiped by the first frame. For a real tab switch, restore inside the
            // render transaction so the first frame already has the target
            // scroll position and draft instead of painting the bottom and then
            // jumping to the saved reading row.
            try {
                if (previousSessionId && targetSessionId && targetSessionId !== previousSessionId) {
                    batchReactiveUpdates(() => this.restore(targetSessionId, applyComposer));
                }
            } finally {
                // A restore failure must never leave the surface's render batch
                // open; that would freeze every later session update.
                if (!showingCached) {
                    end();
                }
            }
        }
    }

    /** Apply a cached tab view synchronously (before any network round-trip). */
    protected applyCachedView(
        sessionId: string,
        saved: AgentConsoleSessionUiSnapshot,
        applyComposer?: (input: string, cursor: number, attachments: AgentConsolePendingAttachment[]) => void
    ): void {
        const { state } = this.resolveHost();
        batchReactiveUpdates(() => {
            state.configure({ sessionId, workspace: saved.workspace || state.workspace });
            state.setMessages(saved.messages || []);
            state.setSections((saved.sections || []).slice());
            state.setGoalSummary(saved.goalSummary || null);
            state.messagesPageCursor = saved.messagesPageCursor || '';
            state.messagesHasMore = saved.messagesHasMore === true;
            state.setPlanTodos((saved.planTodos || []).slice(), saved.planTodoSourceSessionId, saved.planScope || undefined);
            state.setPendingApprovals((saved.pendingApprovals || []).slice());
            if (saved.status) {
                state.setStatus(saved.status);
            }
            this.restoreComposer(state, saved, applyComposer);
            this.restoreMessageSelection(state, saved);
        });
    }

    protected restoreComposer(
        state: AgentConsoleSessionState,
        saved: AgentConsoleSessionUiSnapshot | undefined,
        applyComposer?: (input: string, cursor: number, attachments: AgentConsolePendingAttachment[]) => void
    ): void {
        const input = saved ? saved.input : '';
        const cursor = saved ? saved.inputCursor : 0;
        const attachments = saved ? saved.attachments : [];
        if (applyComposer) {
            // The console host applies these through its reactive proxy so the
            // composer binding re-renders; raw state writes are invisible to
            // other component effects.
            applyComposer(input, cursor, attachments);
            return;
        }
        state.setInput(input, cursor);
        state.setPendingAttachments(attachments);
    }

    protected restoreMessageSelection(state: AgentConsoleSessionState, saved?: AgentConsoleSessionUiSnapshot): void {
        const selectable = (state.messages || []).some(message => message.id === saved?.selectedMessageId);
        if (saved?.messagesFocused && selectable && saved.selectedMessageId) {
            state.selectedMessageId = saved.selectedMessageId;
            state.setMessagesFocused(true);
        } else {
            state.setMessagesFocused(false);
        }
        if (saved?.messageDetailOpen && selectable) {
            state.selectedMessageId = saved.selectedMessageId;
            state.openMessageDetail(false);
            state.messageDetailScroll = saved.messageDetailScroll;
        }
    }

    protected restoreViewport(
        state: AgentConsoleSessionState,
        accessor: ConsoleTerminalSurfaceAccessor | null | undefined,
        sessionId: string,
        saved?: AgentConsoleSessionUiSnapshot
    ): void {
        if (!accessor) {
            return;
        }
        if (saved && !saved.scrollFollowing && saved.scrollOffset > 0) {
            // Anchor by distance from the latest row: restoring a tab can add
            // rows above (message hint), so row-from-top drifts. The console
            // surface queues the distance until the target transcript metrics
            // exist, keeping the restore in the first frame instead of emitting
            // a second frame that visibly jumps.
            if (accessor.queueViewportOffset) {
                accessor.queueViewportOffset(saved.scrollOffset);
                state.transcriptFollowing = false;
                state.messagesNewCount = saved.newCount;
                return;
            }
            const applyOffset = () => accessor.scrollViewportToOffset?.(saved.scrollOffset);
            applyOffset();
            state.syncTranscriptFollowing();
            if (!state.transcriptFollowing) {
                state.messagesNewCount = saved.newCount;
            }
            void Promise.resolve().then(() => {
                if (state.sessionId === sessionId) {
                    applyOffset();
                }
            });
            return;
        }
        accessor.scrollViewportToEdge?.('end');
        state.syncTranscriptFollowing();
        state.messagesNewCount = 0;
    }
}
