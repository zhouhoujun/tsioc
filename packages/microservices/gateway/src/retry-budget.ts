export interface GatewayRetryBudgetOptions {
    /** Allowed retries per successful request in the window. Default 0.1. */
    ratio?: number;
    /** Budget window in milliseconds. Default 10000. */
    ttlMs?: number;
    /**
     * Minimum guaranteed retries per second, independent of successes.
     * Default 1.
     */
    minRetriesPerSec?: number;
}

interface BudgetWindow {
    startedAt: number;
    successes: number;
    retries: number;
}

/**
 * Client-side retry budget: prevents retry storms when an upstream is mostly
 * failing and successes are too rare to justify more retries.
 */
export class GatewayRetryBudget {
    private window: BudgetWindow;
    private readonly ratio: number;
    private readonly ttlMs: number;
    private readonly minRetries: number;

    constructor(
        options: GatewayRetryBudgetOptions = {},
        private readonly now: () => number = () => Date.now()
    ) {
        this.ratio = Math.max(0, options.ratio ?? 0.1);
        this.ttlMs = Math.max(1, options.ttlMs ?? 10_000);
        this.minRetries = Math.max(0, (options.minRetriesPerSec ?? 1) * this.ttlMs / 1000);
        this.window = { startedAt: this.now(), successes: 0, retries: 0 };
    }

    /** Whether another retry is allowed in the current window. */
    allow(): boolean {
        this.refill();
        return this.window.retries < Math.floor(this.window.successes * this.ratio + this.minRetries);
    }

    recordSuccess(): void {
        this.refill();
        this.window.successes += 1;
    }

    recordRetry(): void {
        this.refill();
        this.window.retries += 1;
    }

    private refill(): void {
        const now = this.now();
        if (now - this.window.startedAt < this.ttlMs) {
            return;
        }
        this.window = { startedAt: now, successes: 0, retries: 0 };
    }
}
