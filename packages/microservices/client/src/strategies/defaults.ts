import { Injector } from '@tsdi/ioc';
import { defer, Observable, of, retry, throwError, timer } from 'rxjs';
import { EndpointResolver, EndpointSelection, EndpointSelectionStrategy } from '@tsdi/discovery';
import { CircuitBreakerOptions, ClientEndpoint, DiscoveryOptions, LoadBalanceOptions, LoadBalanceStrategy, RetryOptions } from '../options';
import { CircuitBreakerStrategy } from './CircuitBreakerStrategy';
import { ClientDiscoveryStrategy } from './ClientDiscoveryStrategy';
import { ClientLoadBalanceStrategy } from './LoadBalanceStrategy';
import { RetryStrategy } from './RetryStrategy';

export class DefaultClientDiscoveryStrategy extends ClientDiscoveryStrategy {
    constructor(
        readonly options: DiscoveryOptions = {},
        private readonly injector?: Injector
    ) {
        super();
    }

    async discover(input?: any): Promise<ClientEndpoint[] | void> {
        const service = this.options.serviceName
            ?? input?.service
            ?? input?.pattern?.service
            ?? input?.pattern;
        if (!service || typeof service !== 'string') {
            return;
        }
        const resolver = this.injector?.get(EndpointResolver, null);
        if (!resolver) {
            return;
        }
        const endpoints = await resolver.resolve(service, {
            protocol: this.options.protocol,
            version: this.options.version,
            tags: this.options.tags,
            status: this.options.status ?? 'UP'
        });
        return endpoints;
    }

    onShutdown(): Promise<void> {
        return Promise.resolve();
    }
}

export class DefaultClientLoadBalanceStrategy extends ClientLoadBalanceStrategy {
    private currentWeights = new Map<string, number>();
    private readonly selection = new EndpointSelection();

    constructor(
        readonly options: LoadBalanceOptions = {},
        private readonly injector?: Injector
    ) {
        super();
    }

    chooseServer(endpoints?: ClientEndpoint[]): ClientEndpoint | void {
        if (!endpoints?.length) {
            return;
        }
        const strategy = this.options.strategy ?? LoadBalanceStrategy.RoundRobin;
        const endpoint = this.selection.select(endpoints as any, {
            strategy: this.toSelectionStrategy(strategy),
            weightOf: ep => Math.max(1, (ep as ClientEndpoint).weight ?? 1),
            activeOf: ep => this.currentWeights.get(ep.id) ?? 0
        }) as ClientEndpoint | null;
        if (!endpoint) {
            return;
        }
        // Least-connections tracks selections locally; callers choose when to
        // release (see `release`), mirroring the previous behaviour.
        if (strategy === LoadBalanceStrategy.LeastConnections) {
            this.currentWeights.set(endpoint.id, (this.currentWeights.get(endpoint.id) ?? 0) + 1);
        }
        return endpoint;
    }

    /**
     * Release one least-connections slot for an endpoint.
     */
    release(endpoint: ClientEndpoint): void {
        const current = this.currentWeights.get(endpoint.id) ?? 0;
        if (current > 0) {
            this.currentWeights.set(endpoint.id, current - 1);
        }
    }

    private toSelectionStrategy(strategy: LoadBalanceStrategy): EndpointSelectionStrategy {
        switch (strategy) {
            case LoadBalanceStrategy.Random:
                return 'random';
            case LoadBalanceStrategy.WeightedRoundRobin:
                return 'weighted-round-robin';
            case LoadBalanceStrategy.LeastConnections:
                return 'least-connections';
            default:
                return 'round-robin';
        }
    }
}

export class DefaultCircuitBreakerStrategy extends CircuitBreakerStrategy {
    private failures = 0;
    private openedAt = 0;

    constructor(readonly options: CircuitBreakerOptions = {}) {
        super();
    }

    isOpen(): boolean {
        if (!this.openedAt) {
            return false;
        }
        const waitDuration = this.options.waitDurationInOpenState ?? 0;
        if (waitDuration > 0 && Date.now() - this.openedAt >= waitDuration) {
            this.failures = 0;
            this.openedAt = 0;
            return false;
        }
        return true;
    }

    getOpenError(): Error {
        return new Error('Circuit breaker is open');
    }

    recordSuccess(): void {
        if (!this.isOpen()) {
            this.failures = 0;
        }
    }

    recordFailure(): void {
        if (this.isOpen()) {
            return;
        }
        this.failures += 1;
        if (this.failures >= this.getFailureThreshold()) {
            this.openedAt = Date.now();
        }
    }

    private getFailureThreshold(): number {
        const windowSize = Math.max(1, this.options.slidingWindowSize ?? 1);
        const rate = this.options.failureRateThreshold ?? 1;
        return Math.max(1, Math.ceil(windowSize * rate));
    }
}

export class DefaultRetryStrategy extends RetryStrategy {
    private retryTimestamps: number[] = [];

    constructor(readonly options: RetryOptions = {}) {
        super();
    }

    retry<T>(source: Observable<T>, input?: any): Observable<T> {
        const maxAttempts = Math.max(1, this.options.maxAttempts ?? 3);
        if (maxAttempts <= 1) {
            return source;
        }
        const method = String(input?.method ?? '').toUpperCase();
        const methods = this.options.retryOnMethods?.map(item => item.toUpperCase());
        if (methods?.length && method && !methods.includes(method)) {
            return source;
        }
        return defer(() => {
            const startedAt = Date.now();
            return source.pipe(
                retry({
                    count: maxAttempts - 1,
                    delay: (error, retryCount) => {
                        if (this.options.retryOnExceptions?.length &&
                            !this.options.retryOnExceptions.some(type => error instanceof type)) {
                            return throwError(() => error);
                        }
                        const status = error?.status ?? error?.statusCode;
                        if (this.options.retryOnStatuses?.length && status != null &&
                            !this.options.retryOnStatuses.includes(status)) {
                            return throwError(() => error);
                        }
                        if (!this.consumeBudget()) {
                            return throwError(() => error);
                        }
                        const multiplier = Math.max(1, this.options.backoffMultiplier ?? 1);
                        const waitDuration = this.options.waitDuration ?? 0;
                        let delayMs = waitDuration * Math.max(1, Math.pow(multiplier, retryCount - 1));
                        const jitter = this.options.jitter ?? (multiplier > 1 && delayMs > 0);
                        if (jitter && delayMs > 0) {
                            delayMs = Math.max(0, Math.round(delayMs * (0.5 + Math.random() * 0.5)));
                        }
                        const maxElapsed = this.options.maxElapsed;
                        if (maxElapsed != null && Date.now() - startedAt + delayMs >= maxElapsed) {
                            return throwError(() => error);
                        }
                        return delayMs > 0 ? timer(delayMs) : of(null);
                    }
                })
            );
        });
    }

    private consumeBudget(now = Date.now()): boolean {
        const budget = this.options.retryBudget;
        if (!budget) {
            return true;
        }
        const max = Math.max(1, budget.max ?? 100);
        const windowMs = Math.max(1, budget.windowMs ?? 10_000);
        this.retryTimestamps = this.retryTimestamps.filter(timestamp => now - timestamp < windowMs);
        if (this.retryTimestamps.length >= max) {
            return false;
        }
        this.retryTimestamps.push(now);
        return true;
    }
}
