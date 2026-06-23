import { Observable, of, retry, timer } from 'rxjs';
import { CircuitBreakerOptions, DiscoveryOptions, LoadBalanceOptions, RetryOptions } from '../options';
import { CircuitBreakerStrategy } from './CircuitBreakerStrategy';
import { ClientDiscoveryStrategy } from './ClientDiscoveryStrategy';
import { ClientLoadBalanceStrategy } from './LoadBalanceStrategy';
import { RetryStrategy } from './RetryStrategy';

export class DefaultClientDiscoveryStrategy extends ClientDiscoveryStrategy {
    constructor(readonly options: DiscoveryOptions = {}) {
        super();
    }

    discover(): Promise<void> | Observable<void> {
        return Promise.resolve();
    }

    onShutdown(): Promise<void> {
        return Promise.resolve();
    }
}

export class DefaultClientLoadBalanceStrategy extends ClientLoadBalanceStrategy {
    constructor(readonly options: LoadBalanceOptions = {}) {
        super();
    }

    chooseServer(): Promise<void> | Observable<void> {
        return Promise.resolve();
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
