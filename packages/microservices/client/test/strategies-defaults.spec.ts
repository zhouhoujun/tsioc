import expect = require('expect');
import { DefaultClientDiscoveryStrategy, DefaultClientLoadBalanceStrategy, DefaultCircuitBreakerStrategy, DefaultRetryStrategy } from '../src/strategies/defaults';

describe('DefaultClientDiscoveryStrategy', () => {
    it('discover returns resolved promise', async () => {
        const strategy = new DefaultClientDiscoveryStrategy();
        await expect(strategy.discover()).resolves.toBeUndefined();
    });

    it('onShutdown returns resolved promise', async () => {
        const strategy = new DefaultClientDiscoveryStrategy();
        await expect(strategy.onShutdown()).resolves.toBeUndefined();
    });

    it('stores options', () => {
        const options = { serviceName: 'test-svc' };
        const strategy = new DefaultClientDiscoveryStrategy(options);
        expect(strategy.options).toBe(options);
    });
});

describe('DefaultClientLoadBalanceStrategy', () => {
    it('chooseServer returns resolved promise', async () => {
        const strategy = new DefaultClientLoadBalanceStrategy();
        await expect(strategy.chooseServer()).resolves.toBeUndefined();
    });

    it('stores options', () => {
        const options = { cacheTtl: 3000 };
        const strategy = new DefaultClientLoadBalanceStrategy(options);
        expect(strategy.options).toBe(options);
    });
});

describe('DefaultCircuitBreakerStrategy', () => {
    it('isOpen returns false initially', () => {
        const strategy = new DefaultCircuitBreakerStrategy();
        expect(strategy.isOpen()).toBe(false);
    });

    it('getOpenError returns an error', () => {
        const strategy = new DefaultCircuitBreakerStrategy();
        const err = strategy.getOpenError();
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toContain('Circuit breaker is open');
    });

    it('recordSuccess resets failures below threshold', () => {
        const strategy = new DefaultCircuitBreakerStrategy({ slidingWindowSize: 5, failureRateThreshold: 0.5 });
        strategy.recordFailure();
        strategy.recordFailure();
        strategy.recordSuccess();
        expect(strategy.isOpen()).toBe(false);
    });

    it('opens circuit after exceeding failure threshold', () => {
        const strategy = new DefaultCircuitBreakerStrategy({ slidingWindowSize: 3, failureRateThreshold: 0.5 });
        strategy.recordFailure();
        expect(strategy.isOpen()).toBe(false);
        strategy.recordFailure();
        expect(strategy.isOpen()).toBe(true);
    });

    it('half-opens after waitDuration', () => {
        const strategy = new DefaultCircuitBreakerStrategy({
            slidingWindowSize: 3,
            failureRateThreshold: 0.5,
            waitDurationInOpenState: 1
        });
        strategy.recordFailure();
        strategy.recordFailure();
        expect(strategy.isOpen()).toBe(true);
        return new Promise<void>(resolve => {
            setTimeout(() => {
                expect(strategy.isOpen()).toBe(false);
                resolve();
            }, 5);
        });
    });

    it('recordFailure does nothing when already open', () => {
        const strategy = new DefaultCircuitBreakerStrategy({ slidingWindowSize: 1, failureRateThreshold: 0 });
        strategy.recordFailure();
        const failuresBefore = (strategy as any).failures;
        strategy.recordFailure();
        expect((strategy as any).failures).toBe(failuresBefore);
    });
});

describe('DefaultRetryStrategy', () => {
    it('retry passes through observable with no options', (done) => {
        const strategy = new DefaultRetryStrategy();
        const result = strategy.retry<number>(new (require('rxjs').Observable)((sub: any) => {
            sub.next(42);
            sub.complete();
        }));
        result.subscribe({
            next: (val: number) => {
                expect(val).toBe(42);
            },
            complete: () => done()
        });
    });

    it('retry with single attempt does not retry', (done) => {
        const strategy = new DefaultRetryStrategy({ maxAttempts: 1 });
        let calls = 0;
        const result = strategy.retry<number>(new (require('rxjs').Observable)((sub: any) => {
            calls++;
            sub.error(new Error('fail'));
        }));
        result.subscribe({
            error: () => {
                expect(calls).toBe(1);
                done();
            }
        });
    });

    it('stores options', () => {
        const options = { maxAttempts: 5, waitDuration: 200 };
        const strategy = new DefaultRetryStrategy(options);
        expect(strategy.options).toBe(options);
    });
});
