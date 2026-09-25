import { AgentMessage } from './AgentMessage';
import { AgentTurnDiagnostics } from './AgentEvents';

/**
 * The turn-context fields required for plan-continuation tracking.
 *
 * `TurnExecutionContext` satisfies this structurally, so the tracker can be reused
 * without depending on the runtime's full turn context.
 */
export interface PlanContinuationContext {
    /** Set when a `todo` tool result updated this turn's plan; gates plan-continuation. */
    planTouched?: boolean;
    /** Number of plan-continuation prompts already injected this turn. */
    planContinuations?: number;
    diagnostics?: AgentTurnDiagnostics;
}

/**
 * Tracks per-session todo progress and decides whether a turn must continue its plan
 * instead of ending after the model stopped making tool calls.
 */
export class PlanContinuationTracker {
    private readonly states = new Map<string, { pending: number; inProgress: number }>();

    /** Records the pending/in-progress todo counts reported by a `todo` tool result. */
    track(sessionId: string, turnContext: PlanContinuationContext, toolName: string, output: unknown): void {
        if (toolName !== 'todo' || !output || typeof output !== 'object') {
            return;
        }
        const todos = (output as { todos?: unknown }).todos;
        if (!Array.isArray(todos)) {
            return;
        }
        let pending = 0;
        let inProgress = 0;
        for (const item of todos) {
            const status = String((item as { status?: unknown })?.status || 'pending');
            if (status === 'in_progress') {
                inProgress++;
            } else if (status !== 'completed' && status !== 'cancelled') {
                pending++;
            }
        }
        this.states.set(sessionId, { pending, inProgress });
        turnContext.planTouched = true;
    }

    /** True when this turn touched a plan that still has pending or in-progress items. */
    hasUnfinished(sessionId: string, turnContext: PlanContinuationContext): boolean {
        if (!turnContext.planTouched) {
            return false;
        }
        const state = this.states.get(sessionId);
        return !!state && state.pending + state.inProgress > 0;
    }

    /**
     * Builds the continuation prompt, consuming one continuation budget slot.
     * Returns `undefined` when the plan needs no follow-up, the assistant asked a
     * clarification question, or the per-turn continuation cap is already reached.
     */
    build(
        sessionId: string,
        turnContext: PlanContinuationContext,
        message: AgentMessage,
        cap: number,
        isClarification: (content: string) => boolean
    ): string | undefined {
        if (!turnContext.planTouched) {
            return undefined;
        }
        const state = this.states.get(sessionId);
        if (!state || state.pending + state.inProgress === 0) {
            return undefined;
        }
        if (isClarification(message.content)) {
            return undefined;
        }
        const used = turnContext.planContinuations ?? 0;
        if (used >= cap) {
            return undefined;
        }
        turnContext.planContinuations = used + 1;
        if (turnContext.diagnostics) {
            turnContext.diagnostics.planContinuationsCount = used + 1;
        }
        const parts: string[] = [];
        if (state.inProgress) {
            parts.push(`${state.inProgress} in progress`);
        }
        if (state.pending) {
            parts.push(`${state.pending} pending`);
        }
        return `Your plan still has unfinished items (${parts.join(', ')}). Continue executing the remaining steps now using tools; do not stop or summarize until every item is completed or cancelled.`;
    }
}
