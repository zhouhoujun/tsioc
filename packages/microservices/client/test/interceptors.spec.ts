import expect = require('expect');
import { createInjector, Injectable } from '@tsdi/ioc';
import { createRequestContext, RequestContext } from '@tsdi/common';
import { lastValueFrom, of, throwError, TimeoutError } from 'rxjs';
import {
    CircuitBreakerStrategy,
    ClientDiscoveryStrategy,
    ClientLoadBalanceStrategy,
    RetryStrategy
} from '../src/strategies';
import { TimeoutStrategy } from '../src/strategies/TimeoutStrategy';
import {
    circuitBreakerInterceptor,
    discoverInterceptor,
    loadBalanceInterceptor,
    retryInterceptor
} from '../src/interceptors/features';
import { requestTimeoutInterceptor } from '../src/interceptors/timeout';
import { Observable } from 'rxjs';

@Injectable()
class TestDiscoveryStrategy extends ClientDiscoveryStrategy {
    called = 0;

    discover(): Promise<void> {
        this.called += 1;
        return Promise.resolve();
    }

    onShutdown(): Promise<void> {
        return Promise.resolve();
    }
}

@Injectable()
class TestLoadBalanceStrategy extends ClientLoadBalanceStrategy {
    called = 0;

    chooseServer(): Promise<void> {
        this.called += 1;
        return Promise.resolve();
    }
}

@Injectable()
class TestCircuitBreakerStrategy extends CircuitBreakerStrategy {
    open = false;
    successes = 0;
    failures = 0;

    isOpen(): boolean {
        return this.open;
    }

    getOpenError(): Error {
        return new Error('open');
    }

    recordSuccess(): void {
        this.successes += 1;
    }

    recordFailure(): void {
        this.failures += 1;
    }
}

@Injectable()
class TestRetryStrategy extends RetryStrategy {
    called = 0;

    retry<T>(source: any): any {
        this.called += 1;
        return source;
    }
}

@Injectable()
class TestTimeoutStrategy extends TimeoutStrategy {
    timeoutChecks = 0;
    timeoutReads = 0;
    timeoutErrors = 0;
    allowTimeout = true;
    timeoutValue = 1;

    getTimeout(): number {
        this.timeoutReads += 1;
        return this.timeoutValue;
    }

    handleTimeout(error: Error, _context: RequestContext): Error {
        this.timeoutErrors += 1;
        return new Error(`handled:${error.message}`);
    }

    shouldApplyTimeout(_context: RequestContext): boolean {
        this.timeoutChecks += 1;
        return this.allowTimeout;
    }

    createTimeoutError(timeout: number): Error {
        return new Error(`timeout:${timeout}`);
    }
}

describe('client feature interceptors', () => {
    it('runs discovery strategy before next handler', async () => {
        const strategy = new TestDiscoveryStrategy();
        const injector = createInjector([{ provide: ClientDiscoveryStrategy, useValue: strategy }] as any);
        const context = createRequestContext(injector);
        let nextCalled = 0;
        const result = await lastValueFrom(discoverInterceptor({}, (_input, _context) => {
            nextCalled += 1;
            return of('ok');
        }, context));

        expect(result).toBe('ok');
        expect(strategy.called).toBe(1);
        expect(nextCalled).toBe(1);
    });

    it('runs load balance strategy before next handler', async () => {
        const strategy = new TestLoadBalanceStrategy();
        const injector = createInjector([{ provide: ClientLoadBalanceStrategy, useValue: strategy }] as any);
        const context = createRequestContext(injector);
        let nextCalled = 0;
        await lastValueFrom(loadBalanceInterceptor({}, (_input, _context) => {
            nextCalled += 1;
            return of('ok');
        }, context));

        expect(strategy.called).toBe(1);
        expect(nextCalled).toBe(1);
    });

    it('records circuit breaker success and failure', async () => {
        const strategy = new TestCircuitBreakerStrategy();
        const injector = createInjector([{ provide: CircuitBreakerStrategy, useValue: strategy }] as any);
        const context = createRequestContext(injector);

        await lastValueFrom(circuitBreakerInterceptor({}, () => of('ok'), context));
        expect(strategy.successes).toBe(1);

        await expect(lastValueFrom(circuitBreakerInterceptor({}, () => throwError(() => new Error('failed')), context)))
            .rejects.toThrow('failed');
        expect(strategy.failures).toBe(1);
    });

    it('delegates retry to retry strategy', async () => {
        const strategy = new TestRetryStrategy();
        const injector = createInjector([{ provide: RetryStrategy, useValue: strategy }] as any);
        const context = createRequestContext(injector);
        const result = await lastValueFrom(retryInterceptor({}, () => of('ok'), context));

        expect(result).toBe('ok');
        expect(strategy.called).toBe(1);
    });

    it('uses timeout strategy to resolve timeout and error handling', async () => {
        const strategy = new TestTimeoutStrategy();
        const injector = createInjector([{ provide: TimeoutStrategy, useValue: strategy }] as any);
        const context = createRequestContext(injector);

        await expect(lastValueFrom(requestTimeoutInterceptor()({}, () => throwError(() => new TimeoutError()), context)))
            .rejects.toThrow('handled:timeout:1');
        expect(strategy.timeoutChecks).toBe(1);
        expect(strategy.timeoutReads).toBe(1);
        expect(strategy.timeoutErrors).toBe(1);
    });

    it('prefers request timeout over interceptor default and strategy timeout', async () => {
        const strategy = new TestTimeoutStrategy();
        strategy.timeoutValue = 50;
        const injector = createInjector([{ provide: TimeoutStrategy, useValue: strategy }] as any);
        const context = createRequestContext(injector);

        await expect(lastValueFrom(requestTimeoutInterceptor(20)({ timeout: 5 }, () => throwError(() => new TimeoutError()), context)))
            .rejects.toThrow('handled:timeout:5');
        expect(strategy.timeoutReads).toBe(0);
    });

    it('falls back to interceptor default timeout before strategy timeout', async () => {
        const strategy = new TestTimeoutStrategy();
        strategy.timeoutValue = 50;
        const injector = createInjector([{ provide: TimeoutStrategy, useValue: strategy }] as any);
        const context = createRequestContext(injector);

        await expect(lastValueFrom(requestTimeoutInterceptor(20)({}, () => throwError(() => new TimeoutError()), context)))
            .rejects.toThrow('handled:timeout:20');
        expect(strategy.timeoutReads).toBe(0);
    });
});
