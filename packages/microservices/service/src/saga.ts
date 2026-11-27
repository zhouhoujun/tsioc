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

export interface SagaJournalEntry {
    completed: string[];
    failedStep?: string;
    updatedAt: number;
}

/**
 * Persistence hook for resumable sagas. A durable implementation should write
 * the entry in the same transaction as the step's business effect.
 */
export interface SagaJournal {
    load(id: string): SagaJournalEntry | undefined | Promise<SagaJournalEntry | undefined>;
    save(id: string, entry: SagaJournalEntry): void | Promise<void>;
    clear(id: string): void | Promise<void>;
}

/** Bounded in-memory journal for tests/single-process workers. */
export class MemorySagaJournal implements SagaJournal {
    private readonly entries = new Map<string, SagaJournalEntry>();

    async load(id: string): Promise<SagaJournalEntry | undefined> {
        const entry = this.entries.get(id);
        return entry ? { ...entry, completed: [...entry.completed] } : undefined;
    }

    async save(id: string, entry: SagaJournalEntry): Promise<void> {
        this.entries.set(id, { ...entry, completed: [...entry.completed] });
    }

    async clear(id: string): Promise<void> {
        this.entries.delete(id);
    }
}

export interface SagaOptions {
    /** Optional hook for logging/audit of each step. */
    onStep?: (event: 'execute' | 'complete' | 'compensate', step: SagaStep) => void;
    /** Optional persistent journal; requires `sagaId`. */
    journal?: SagaJournal;
    sagaId?: string;
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
    const journal = options.journal && options.sagaId ? options.journal : undefined;
    const previous = journal ? await journal.load(options.sagaId!) : undefined;
    const completed: string[] = (previous?.completed ?? []).filter(name => steps.some(step => step.name === name));
    const completedSet = new Set(completed);
    for (const step of steps) {
        if (completedSet.has(step.name)) {
            continue;
        }
        options.onStep?.('execute', step);
        try {
            await step.execute(context);
            completed.push(step.name);
            completedSet.add(step.name);
            await journal?.save(options.sagaId!, {
                completed: [...completed],
                updatedAt: Date.now()
            });
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
            if (journal) {
                if (compensationErrors.length) {
                    await journal.save(options.sagaId!, {
                        completed: [...completed],
                        failedStep: step.name,
                        updatedAt: Date.now()
                    });
                } else {
                    await journal.clear(options.sagaId!);
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
    await journal?.clear(options.sagaId!);
    return { completed };
}
