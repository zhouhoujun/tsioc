/**
 * G29: per-turn multi-agent delegation mode.
 *
 * - `disabled`: delegation tools (`spawn_agent` / `parallel_spawn`) are
 *   blocked for the turn; the system prompt states that delegation is
 *   unavailable so the model never attempts it.
 * - `explicit`: current default — delegation happens only when the model or
 *   the user explicitly invokes a delegation tool.
 * - `proactive`: the runtime injects delegation guidance into the system
 *   prompt and applies a quality gate that keeps delegating when a
 *   `coding_task` finishes with incomplete delivery or failed actions.
 */
export type AgentDelegationMode = 'disabled' | 'explicit' | 'proactive';

export const DELEGATION_MODES: AgentDelegationMode[] = ['disabled', 'explicit', 'proactive'];

/**
 * Built-in fallback delegation mode.
 * @deprecated schema-default alias — prefer `AgentPolicyConfig.delegationMode`
 * (or `AgentOptions.delegationMode`) for the configured default.
 */
export const DEFAULT_DELEGATION_MODE: AgentDelegationMode = 'explicit';

/**
 * Normalize a raw value into a delegation mode. Returns undefined when the
 * value is not a known mode so callers can reject invalid input.
 */
export function normalizeDelegationMode(value: unknown): AgentDelegationMode | undefined {
    if (value === 'disabled' || value === 'explicit' || value === 'proactive') {
        return value;
    }
    return undefined;
}

/**
 * System-prompt guidance for the active delegation mode. The default
 * ('explicit') mode yields an empty hint so default sessions keep today's
 * system prompt byte-for-byte. 'proactive' guides when to delegate;
 * 'disabled' states that delegation tools are unavailable.
 */
export function buildDelegationModeHint(mode: AgentDelegationMode | undefined): string {
    if (mode === 'proactive') {
        return '\n\n## Delegation mode\nThis session runs in PROACTIVE DELEGATION MODE. When the task has several independent or parallelizable subtasks - multiple files to implement, independent research tracks, or isolated verification runs - proactively delegate them to sub-agents with `spawn_agent` (or `parallel_spawn`) instead of executing every step serially in this session. Keep each delegation goal narrow and its context self-contained. Keep delegating until the remaining work is small enough to finish directly.';
    }
    if (mode === 'disabled') {
        return '\n\n## Delegation mode\nDelegation is DISABLED for this session. Do not call `spawn_agent`, `parallel_spawn`, or any other delegation tools; complete the work directly in this session.';
    }
    return '';
}

/** Structured delivery signal extracted from a `coding_task` outcome. */
export interface CodingTaskDeliverySignal {
    /** `true` when the task explicitly reports incomplete delivery. */
    deliveryIncomplete: boolean;
    /** Id of the first failed action, when any. */
    failedActionId?: string;
}

/**
 * Extract the delivery signal from a raw `coding_task` output value. Only
 * execution outcomes (`ran: true`) are inspected; plan/create/list/cancel/
 * rollback actions are not deliveries and yield undefined.
 */
export function extractCodingTaskDeliverySignal(output: unknown): CodingTaskDeliverySignal | undefined {
    if (!output || typeof output !== 'object' || Array.isArray(output)) {
        return undefined;
    }
    const raw = output as Record<string, any>;
    if (raw.ran !== true) {
        return undefined;
    }
    return {
        deliveryIncomplete: raw.deliveryIncomplete === true,
        failedActionId: typeof raw.failedActionId === 'string' && raw.failedActionId.trim()
            ? raw.failedActionId
            : undefined
    };
}

/**
 * G29 delegation quality gate: decide whether a `coding_task` outcome should
 * trigger continued delegation in proactive mode. Returns a transient
 * system-prompt note, or undefined when no delegation follow-up is warranted
 * (completed delivery, plan-only actions, non-coding tools).
 */
export function buildDelegationQualityNote(error: Error | undefined, output: unknown): string | undefined {
    if (error) {
        return 'Delegation quality gate: the last `coding_task` failed. If the remaining work can be split into independent subtasks, delegate them to sub-agents (`spawn_agent`/`parallel_spawn`) to parallelize recovery instead of re-running the whole task serially.';
    }
    const signal = extractCodingTaskDeliverySignal(output);
    if (!signal) {
        return undefined;
    }
    if (signal.deliveryIncomplete) {
        return 'Delegation quality gate: the last `coding_task` reported an incomplete delivery - implementation work remains. Delegate the remaining work to sub-agents (`spawn_agent`/`parallel_spawn`) so it can be completed in parallel.';
    }
    if (signal.failedActionId) {
        return 'Delegation quality gate: the last `coding_task` had a failed action. Delegate the failed subtask to a sub-agent (`spawn_agent`) with the failure context so it can be repaired independently.';
    }
    return undefined;
}
