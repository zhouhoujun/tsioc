import type { AgentConsolePendingAttachment, AgentConsoleSessionState } from './AgentConsoleSessionState';
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
}

export interface AgentConsoleSessionUiStateHost {
    state: AgentConsoleSessionState;
    surfaceAccessor?: ConsoleTerminalSurfaceAccessor | null;
}

/**
 * Each session tab behaves like its own agent TUI: scroll position, composer
 * draft/attachments, message selection and detail view are saved when leaving a
 * tab and restored when returning to it. Server-backed data (messages, plan,
 * approvals, tools) is reloaded per session by the session-open path.
 */
export class AgentConsoleSessionUiState {
    protected readonly snapshots = new Map<string, AgentConsoleSessionUiSnapshot>();

    constructor(protected readonly host: () => AgentConsoleSessionUiStateHost) {
    }

    /** Save the outgoing tab's UI state (no-op for an empty session id). */
    capture(sessionId?: string): void {
        const id = String(sessionId || '').trim();
        if (!id) {
            return;
        }
        const { state, surfaceAccessor } = this.host();
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
            messageDetailScroll: state.messageDetailScroll
        });
    }

    /** Restore the incoming tab's UI state; a first visit starts empty/following. */
    restore(sessionId: string): void {
        const id = String(sessionId || '').trim();
        if (!id) {
            return;
        }
        const { state, surfaceAccessor } = this.host();
        const saved = this.snapshots.get(id);
        this.restoreComposer(state, saved);
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
        open: () => Promise<void>,
        currentSessionId: () => string,
        begin: () => void = () => undefined,
        end: () => void = () => undefined
    ): Promise<void> {
        const previousSessionId = currentSessionId();
        this.capture(previousSessionId);
        begin();
        try {
            await open();
        } finally {
            const targetSessionId = currentSessionId();
            // Startup (no previous tab) must not restore: the session-open path
            // already cleared the composer, and an early keystroke must not be
            // wiped by the first frame. For a real tab switch, restore inside the
            // render transaction so the first frame already has the target
            // scroll position and draft instead of painting the bottom and then
            // jumping to the saved reading row.
            if (previousSessionId && targetSessionId && targetSessionId !== previousSessionId) {
                this.restore(targetSessionId);
            }
            end();
        }
    }

    protected restoreComposer(state: AgentConsoleSessionState, saved?: AgentConsoleSessionUiSnapshot): void {
        state.setInput(saved ? saved.input : '', saved ? saved.inputCursor : 0);
        state.setPendingAttachments(saved ? saved.attachments : []);
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
