/**
 * Minimal saga primitive: execute steps in order and compensate completed
 * steps in reverse when one fails.
 *
 * The helper is transport/storage agnostic. For durable sagas persist the step
 * results/outbox records with the business transaction and resume from the
 * persisted position.
 */
export interface SagaStep<TContext = any> {
    name: string;
    execute(context: TContext): void | Promise<void>;
    compensate?(context: TContext): void | Promise<void>;
}

export interface SagaFailure {
    failedStep: string;
    error: unknown;
    completed: string[];
    compensated: string[];
    compensationErrors: Array<{ step: string; error: unknown }>;
}

export class SagaError extends Error {
    constructor(readonly failure: SagaFailure) {
        super(`Saga failed at '${failure.failedStep}': ${(failure.error as any)?.message ?? failure.error}`);
        this.name = 'SagaError';
    }
}

export interface SagaOptions {
    /** Optional hook for logging/audit of each step. */
    onStep?: (event: 'execute' | 'complete' | 'compensate', step: SagaStep) => void;
}

/**
 * Run a saga. On failure all completed steps with a `compensate` hook are
 * compensated in reverse order; compensation errors are collected instead of
 * masking the original failure.
 */
export async function runSaga<TContext>(
    steps: SagaStep<TContext>[],
    context: TContext,
    options: SagaOptions = {}
): Promise<{ completed: string[] }> {
    const completed: string[] = [];
    for (const step of steps) {
        options.onStep?.('execute', step);
        try {
            await step.execute(context);
            completed.push(step.name);
            options.onStep?.('complete', step);
        } catch (error) {
            const compensated: string[] = [];
            const compensationErrors: Array<{ step: string; error: unknown }> = [];
            for (const done of [...completed].reverse()) {
                const current = steps.find(item => item.name === done);
                if (!current?.compensate) {
                    continue;
                }
                options.onStep?.('compensate', current);
                try {
                    await current.compensate(context);
                    compensated.push(done);
                } catch (compensationError) {
                    compensationErrors.push({ step: done, error: compensationError });
                }
            }
            throw new SagaError({
                failedStep: step.name,
                error,
                completed: [...completed],
                compensated,
                compensationErrors
            });
        }
    }
    return { completed };
}
