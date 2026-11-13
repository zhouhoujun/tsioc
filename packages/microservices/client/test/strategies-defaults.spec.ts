import expect = require('expect');
import { createInjector } from '@tsdi/ioc';
import { lastValueFrom } from 'rxjs';
import { EndpointResolver } from '@tsdi/discovery';
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

    it('resolves endpoints through EndpointResolver when a service is configured', async () => {
        const endpoint = { id: '1', name: 'users', address: '10.0.0.1:8080', status: 'UP' as const };
        const calls: any[] = [];
        const injector = createInjector([{
            provide: EndpointResolver,
            useValue: {
                resolve: async (service: string, options: any) => {
                    calls.push({ service, options });
                    return [endpoint];
                }
            }
        }]);
        const strategy = new DefaultClientDiscoveryStrategy({ serviceName: 'users', tags: ['api'] }, injector);

        await expect(strategy.discover()).resolves.toEqual([endpoint]);
        expect(calls[0].service).toBe('users');
        expect(calls[0].options.status).toBe('UP');
        expect(calls[0].options.tags).toEqual(['api']);
    });
});

describe('DefaultClientLoadBalanceStrategy', () => {
    it('chooseServer returns undefined without endpoints', () => {
        const strategy = new DefaultClientLoadBalanceStrategy();
        expect(strategy.chooseServer()).toBeUndefined();
    });

    it('stores options', () => {
        const options = { cacheTtl: 3000 };
        const strategy = new DefaultClientLoadBalanceStrategy(options);
        expect(strategy.options).toBe(options);
    });

    it('round-robins across endpoints by default', () => {
        const strategy = new DefaultClientLoadBalanceStrategy();
        const endpoints = [
            { id: '1', name: 'svc', address: 'a' },
            { id: '2', name: 'svc', address: 'b' }
        ];
        expect(strategy.chooseServer(endpoints)?.id).toBe('1');
        expect(strategy.chooseServer(endpoints)?.id).toBe('2');
        expect(strategy.chooseServer(endpoints)?.id).toBe('1');
    });

    it('uses endpoint weight for weighted round-robin', () => {
        const strategy = new DefaultClientLoadBalanceStrategy({ strategy: 2 });
        const endpoints = [
            { id: '1', name: 'svc', address: 'a', weight: 1 },
            { id: '2', name: 'svc', address: 'b', weight: 9 }
        ];
        const counts: Record<string, number> = { '1': 0, '2': 0 };
        for (let i = 0; i < 10; i++) {
            const picked = strategy.chooseServer(endpoints)!;
            counts[picked.id]++;
        }
        expect(counts['2']).toBeGreaterThan(counts['1']);
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

    function failingSource(counter: { calls: number }, error: any = new Error('fail')) {
        const { Observable } = require('rxjs');
        return new Observable((sub: any) => {
            counter.calls++;
            sub.error(error);
        });
    }

    it('does not retry a method outside retryOnMethods', async () => {
        const strategy = new DefaultRetryStrategy({ maxAttempts: 3, retryOnMethods: ['GET'] });
        const counter = { calls: 0 };
        await expect(lastValueFrom(strategy.retry(failingSource(counter), { method: 'POST' }))).rejects.toThrow('fail');
        expect(counter.calls).toBe(1);
    });

    it('does not retry a status outside retryOnStatuses', async () => {
        const strategy = new DefaultRetryStrategy({ maxAttempts: 3, retryOnStatuses: [503] });
        const counter = { calls: 0 };
        const error = Object.assign(new Error('bad request'), { status: 400 });
        await expect(lastValueFrom(strategy.retry(failingSource(counter, error)))).rejects.toThrow('bad request');
        expect(counter.calls).toBe(1);
    });

    it('stops retrying when maxElapsed would be exceeded', async () => {
        const strategy = new DefaultRetryStrategy({ maxAttempts: 5, waitDuration: 50, maxElapsed: 20 });
        const counter = { calls: 0 };
        const startedAt = Date.now();
        await expect(lastValueFrom(strategy.retry(failingSource(counter)))).rejects.toThrow('fail');
        expect(counter.calls).toBe(1);
        expect(Date.now() - startedAt).toBeLessThan(40);
    });

    it('enforces the retry budget across calls', async () => {
        const strategy = new DefaultRetryStrategy({ maxAttempts: 5, retryBudget: { max: 1, windowMs: 10_000 } });
        const counter = { calls: 0 };
        await expect(lastValueFrom(strategy.retry(failingSource(counter)))).rejects.toThrow('fail');
        expect(counter.calls).toBe(2);
    });
});
