/**
 * Thrown when a running agent turn is cancelled through `AgentRuntime.cancelTurn`.
 *
 * Turn cancellation is an exceptional path: the runtime stops before the next
 * model/tool checkpoint, publishes an `AgentTurnCancelledEvent`, and rethrows
 * this error so callers (gateway RPC, CLI, streaming consumers) can distinguish
 * a deliberate user cancellation from a real failure.
 */
export class AgentTurnCancelledError extends Error {
    constructor(readonly sessionId: string) {
        super(`Turn for session '${sessionId}' was cancelled.`);
        this.name = 'AgentTurnCancelledError';
    }
}
