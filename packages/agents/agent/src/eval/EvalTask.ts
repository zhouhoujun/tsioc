export interface EvalTask {
    id: string;
    repo?: string;
    issue: string;
    sessionId?: string;
    profile?: string;
    verifyCommands?: string[];
    expectedCriteria?: string[];
}

export interface EvalVerification { command: string; ok: boolean; output?: string; }

/** Trajectory metrics captured from the persisted session after a run. */
export interface EvalMetrics {
    userMessages: number;
    assistantMessages: number;
    toolCalls: number;
    toolFailures: number;
    turns: number;
    durationMs: number;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
}

export interface EvalRun {
    id: string;
    taskId: string;
    status: 'passed' | 'failed';
    score: number;
    startedAt: string;
    finishedAt: string;
    message?: string;
    verifications: EvalVerification[];
    diff?: { files: number; additions: number; deletions: number };
    metrics?: EvalMetrics;
}

export interface EvalRegressionThresholds {
    /** Allowed increase in tool failure rate (default 0.2). */
    toolFailureRate?: number;
    /** Allowed duration multiplier versus baseline (default 2). */
    durationMultiplier?: number;
    /** Allowed total-token multiplier versus baseline (default 2). */
    tokenMultiplier?: number;
}

export interface EvalComparison {
    ok: boolean;
    regressions: string[];
}

/** Compare a current run against a baseline for quality/cost regressions. */
export function compareEvalMetrics(
    baseline: EvalMetrics | undefined,
    current: EvalMetrics | undefined,
    thresholds: EvalRegressionThresholds = {}
): EvalComparison {
    const regressions: string[] = [];
    if (!baseline || !current) {
        return { ok: true, regressions };
    }
    const rate = (value: EvalMetrics): number => value.toolCalls > 0 ? value.toolFailures / value.toolCalls : 0;
    const allowedFailureRate = thresholds.toolFailureRate ?? 0.2;
    if (rate(current) - rate(baseline) > allowedFailureRate) {
        regressions.push(`tool failure rate ${Math.round(rate(current) * 100)}% > ${Math.round(rate(baseline) * 100)}%`);
    }
    const durationMultiplier = thresholds.durationMultiplier ?? 2;
    if (baseline.durationMs > 0 && current.durationMs > baseline.durationMs * durationMultiplier) {
        regressions.push(`duration ${current.durationMs}ms > ${durationMultiplier}x baseline ${baseline.durationMs}ms`);
    }
    const tokenMultiplier = thresholds.tokenMultiplier ?? 2;
    if ((baseline.totalTokens ?? 0) > 0 && (current.totalTokens ?? 0) > (baseline.totalTokens ?? 0) * tokenMultiplier) {
        regressions.push(`tokens ${current.totalTokens} > ${tokenMultiplier}x baseline ${baseline.totalTokens}`);
    }
    return { ok: regressions.length === 0, regressions };
}
