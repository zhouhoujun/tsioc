import { AgentTurnCancelledError } from './AgentTurnCancelledError';

/**
 * Session-scoped abort scopes for running turns.
 *
 * A turn opens a scope when it starts and closes it when it settles. The scope
 * signal is shared with the model request and with long-running tool
 * invocations, so cancelling a turn (Esc) reaches whatever is currently
 * running instead of waiting for it to finish on its own.
 */
export class TurnAbortScopes {
    private scopes = new Map<string, AbortController>();

    /** Opens a fresh abort scope for the session, replacing any stale one. */
    begin(sessionId: string): void {
        this.scopes.set(sessionId, new AbortController());
    }

    /** Closes the session's abort scope. */
    end(sessionId: string): void {
        this.scopes.delete(sessionId);
    }

    /** Signal collaborators can observe to react to cancellation. */
    signal(sessionId: string): AbortSignal | undefined {
        return this.scopes.get(sessionId)?.signal;
    }

    /** True once the session's turn has been cancelled. */
    isAborted(sessionId: string): boolean {
        return this.scopes.get(sessionId)?.signal.aborted === true;
    }

    /** True while the session has an open, not-yet-cancelled scope. */
    isActive(sessionId: string): boolean {
        const controller = this.scopes.get(sessionId);
        return !!controller && !controller.signal.aborted;
    }

    /** Aborts the session's scope; false when there is nothing left to cancel. */
    cancel(sessionId: string): boolean {
        const controller = this.scopes.get(sessionId);
        if (!controller || controller.signal.aborted) {
            return false;
        }
        controller.abort();
        return true;
    }

    /** Throws when the session's turn has been cancelled. */
    throwIfCancelled(sessionId: string): void {
        if (this.isAborted(sessionId)) {
            throw new AgentTurnCancelledError(sessionId);
        }
    }
}
