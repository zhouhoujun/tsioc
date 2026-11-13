import { Injector } from '@tsdi/ioc';
import { Observable, of, retry, timer } from 'rxjs';
import { EndpointResolver } from '@tsdi/discovery';
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
    private cursor = 0;
    private currentWeights = new Map<string, number>();

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
        switch (this.options.strategy ?? LoadBalanceStrategy.RoundRobin) {
            case LoadBalanceStrategy.Random:
                return endpoints[Math.floor(Math.random() * endpoints.length)];
            case LoadBalanceStrategy.WeightedRoundRobin:
                return this.smoothWeighted(endpoints);
            case LoadBalanceStrategy.LeastConnections:
                // Selection counts approximate in-flight pressure; callers may
                // add a selector for exact release semantics.
                return this.leastSelected(endpoints);
            default:
                return endpoints[this.cursor++ % endpoints.length];
        }
    }

    private smoothWeighted(endpoints: ClientEndpoint[]): ClientEndpoint {
        let total = 0;
        let selected: ClientEndpoint = endpoints[0];
        let selectedWeight = -Infinity;
        for (const endpoint of endpoints) {
            const weight = Math.max(1, endpoint.weight ?? 1);
            total += weight;
            const current = (this.currentWeights.get(endpoint.id) ?? 0) + weight;
            this.currentWeights.set(endpoint.id, current);
            if (current > selectedWeight) {
                selectedWeight = current;
                selected = endpoint;
            }
        }
        this.currentWeights.set(selected.id, (this.currentWeights.get(selected.id) ?? 0) - total);
        return selected;
    }

    private leastSelected(endpoints: ClientEndpoint[]): ClientEndpoint {
        let selected = endpoints[0];
        let min = Infinity;
        for (const endpoint of endpoints) {
            const count = this.currentWeights.get(endpoint.id) ?? 0;
            if (count < min) {
                min = count;
                selected = endpoint;
            }
        }
        this.currentWeights.set(selected.id, (this.currentWeights.get(selected.id) ?? 0) + 1);
        return selected;
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
    constructor(readonly options: RetryOptions = {}) {
        super();
    }

    retry<T>(source: Observable<T>): Observable<T> {
        const maxAttempts = Math.max(1, this.options.maxAttempts ?? 3);
        if (maxAttempts <= 1) {
            return source;
        }
        return source.pipe(
            retry({
                count: maxAttempts - 1,
                delay: (error, retryCount) => {
                    if (this.options.retryOnExceptions?.length &&
                        !this.options.retryOnExceptions.some(type => error instanceof type)) {
                        throw error;
                    }
                    const multiplier = Math.max(1, this.options.backoffMultiplier ?? 1);
                    const waitDuration = this.options.waitDuration ?? 0;
                    const delayMs = waitDuration * Math.max(1, Math.pow(multiplier, retryCount - 1));
                    return delayMs > 0 ? timer(delayMs) : of(null);
                }
            })
        );
    }
}
