import { AgentTurnDiagnostics } from './AgentEvents';
import { DEFAULT_VERIFICATION_WRITE_TOOLS } from '../harness/VerificationGate';

const WRITE_TOOLS = new Set(DEFAULT_VERIFICATION_WRITE_TOOLS);

/** The auto-runner only discovers `typecheck`/`lint`, so model-driven `npm test`/`build` calls are matched by name here. */
const VERIFICATION_PATTERN = /\b(tests?|build|typecheck|type-check|lint|tsc|jest|vitest|mocha|pytest|compile)\b/i;

export interface TurnEvidenceEntry {
    toolName?: string;
    inputSummary?: string;
    verification?: string;
}

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
    /** Tool evidence for this turn, used to detect whether verification already ran. */
    evidenceLedger?: { entriesFrom(index: number): TurnEvidenceEntry[] };
}

/**
 * Tracks per-session todo progress and decides whether a turn must continue its plan
 * instead of ending after the model stopped making tool calls.
 */
export class PlanContinuationTracker {
    private readonly states = new Map<string, { pending: number; inProgress: number }>();
    private readonly writes = new Set<string>();

    /** Records the pending/in-progress todo counts reported by a `todo` tool result. */
    track(sessionId: string, turnContext: PlanContinuationContext, toolName: string, output: unknown): void {
        if (WRITE_TOOLS.has(toolName)) {
            this.writes.add(sessionId);
        }
        if (toolName !== 'todo' || !output || typeof output !== 'object') {
            return;
        }
        const todos = this.extractPlanItems(output);
        if (!todos) {
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

    /** `action: decompose` reports the active plan as `accepted`, not `todos`. */
    private extractPlanItems(output: unknown): unknown[] | undefined {
        const record = output as { todos?: unknown; accepted?: unknown };
        if (Array.isArray(record.todos)) {
            return record.todos;
        }
        if (Array.isArray(record.accepted) && record.accepted.length > 0) {
            return record.accepted;
        }
        return undefined;
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
     *
     * An unfinished plan forces continuation even when the assistant asks the user a
     * clarifying question: asking does not satisfy a pending plan item, so the turn
     * continues and the model is told to resolve the ambiguity with a stated default
     * instead of waiting for an answer.
     *
     * Returns `undefined` when nothing is outstanding or the per-turn continuation cap
     * is already reached.
     */
    build(
        sessionId: string,
        turnContext: PlanContinuationContext,
        cap: number
    ): string | undefined {
        return this.buildPlanPrompt(sessionId, turnContext, cap)
            ?? this.buildVerificationPrompt(sessionId, turnContext, cap);
    }

    private buildPlanPrompt(sessionId: string, turnContext: PlanContinuationContext, cap: number): string | undefined {
        if (!turnContext.planTouched) {
            return undefined;
        }
        const state = this.states.get(sessionId);
        if (!state || state.pending + state.inProgress === 0) {
            return undefined;
        }
        if (!this.consumeBudget(turnContext, cap)) {
            return undefined;
        }
        const parts: string[] = [];
        if (state.inProgress) {
            parts.push(`${state.inProgress} in progress`);
        }
        if (state.pending) {
            parts.push(`${state.pending} pending`);
        }
        return `Your plan still has unfinished items (${parts.join(', ')}). Do not ask the user for clarification and do not wait for an answer: if something is ambiguous, pick a reasonable default, state it briefly, and keep going. Complete the remaining steps with tools now, including verifying the result (build, tests, or type checks when the task changed code), and do not stop or summarize until every item is completed or cancelled.`;
    }

    private buildVerificationPrompt(sessionId: string, turnContext: PlanContinuationContext, cap: number): string | undefined {
        if (!turnContext.planTouched) {
            return undefined;
        }
        if (!this.writes.has(sessionId) || this.hasVerificationEvidence(turnContext)) {
            return undefined;
        }
        if (!this.consumeBudget(turnContext, cap)) {
            return undefined;
        }
        return 'You changed code but have not verified the result yet. Do not end this turn: run the project verification now (for example the build, the tests, or a type check) with a tool, report the actual output, and fix anything that fails before you finish.';
    }

    private hasVerificationEvidence(turnContext: PlanContinuationContext): boolean {
        const entries = turnContext.evidenceLedger?.entriesFrom(0) ?? [];
        return entries.some(entry => {
            if (!entry || WRITE_TOOLS.has(entry.toolName ?? '')) {
                return false;
            }
            return !!entry.verification || VERIFICATION_PATTERN.test(entry.inputSummary ?? '');
        });
    }

    private consumeBudget(turnContext: PlanContinuationContext, cap: number): boolean {
        const used = turnContext.planContinuations ?? 0;
        if (used >= cap) {
            return false;
        }
        turnContext.planContinuations = used + 1;
        if (turnContext.diagnostics) {
            turnContext.diagnostics.planContinuationsCount = used + 1;
        }
        return true;
    }
}
