import expect = require('expect');
import { createInjector, Injector } from '@tsdi/ioc';
import { Observable, of, lastValueFrom, throwError } from 'rxjs';
import { MicroService } from '../src/Service';
import { InFlightTracker } from '../src/InFlightTracker';
import { ReadinessStateService, ReadinessPhase } from '../src/readiness';
import { InFlightInterceptor } from '../src/interceptors/in-flight';
import { DefaultGracefulShutdownStrategy } from '../src/strategies/default-graceful-shutdown.strategy';
import { REGISTRATION_STRATEGY } from '../src/strategies/IRegistrationStrategy';
import { HEALTH_CHECK_STRATEGY } from '../src/strategies/IHealthCheckStrategy';
import { GRACEFUL_SHUTDOWN_STRATEGY } from '../src/strategies/IGracefulShutdownStrategy';

type FailurePoint = 'listen' | 'register' | 'health' | 'health-stop';

/**
 * Minimal MicroService double recording the lifecycle order.
 */
class RecordingService extends MicroService<any, any, any> {
    readonly calls: string[] = [];
    readonly drainPhases: ReadinessPhase[] = [];
    failAt?: FailurePoint;
    readonly injector: Injector;

    readonly handler: any = {
        onDestroy: () => this.calls.push('handler-destroy')
    };

    constructor(failAt?: FailurePoint) {
        super();
        this.failAt = failAt;
        this.injector = createInjector([
            ReadinessStateService,
            {
                provide: REGISTRATION_STRATEGY,
                useValue: {
                    register: async () => {
                        this.calls.push('register');
                        if (this.failAt === 'register') {
                            throw new Error('register failed');
                        }
                    },
                    deregister: async () => {
                        this.calls.push('deregister');
                    }
                }
            },
            {
                provide: HEALTH_CHECK_STRATEGY,
                useValue: {
                    start: async () => {
                        this.calls.push('health');
                        if (this.failAt === 'health') {
                            throw new Error('health failed');
                        }
                    },
                    stop: async () => {
                        this.calls.push('health-stop');
                        if (this.failAt === 'health-stop') {
                            throw new Error('health stop failed');
                        }
                    }
                }
            },
            {
                provide: GRACEFUL_SHUTDOWN_STRATEGY,
                useValue: {
                    shutdown: async () => {
                        this.calls.push('drain');
                        this.drainPhases.push(this.injector.get(ReadinessStateService).current);
                    }
                }
            }
        ]);
    }

    protected async onStart(): Promise<string> {
        this.calls.push('listen');
        if (this.failAt === 'listen') {
            throw new Error('listen failed');
        }
        return 'started';
    }

    protected async onShutdown(): Promise<void> {
        this.calls.push('shutdown');
    }
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('MicroService lifecycle', () => {
    it('listens before registering and reporting health', async () => {
        const service = new RecordingService();

        const result = await service.start();

        expect(result).toBe('started');
        expect(service.calls).toEqual(['listen', 'register', 'health']);
        expect(service.injector.get(ReadinessStateService).current).toBe('UP');
    });

    it('does not register when listening fails', async () => {
        const service = new RecordingService('listen');

        await expect(service.start()).rejects.toThrow('listen failed');

        expect(service.calls).toEqual(['listen', 'health-stop', 'deregister', 'shutdown']);
    });

    it('rolls back health and the listener when registration fails', async () => {
        const service = new RecordingService('register');

        await expect(service.start()).rejects.toThrow('register failed');

        expect(service.calls).toEqual(['listen', 'register', 'health-stop', 'deregister', 'shutdown']);
        expect(service.injector.get(ReadinessStateService).current).toBe('DOWN');
    });

    it('rolls back registration and the listener when health start fails', async () => {
        const service = new RecordingService('health');

        await expect(service.start()).rejects.toThrow('health failed');

        expect(service.calls).toEqual(['listen', 'register', 'health', 'health-stop', 'deregister', 'shutdown']);
    });

    it('marks readiness down, deregisters, drains and then stops the transport', async () => {
        const service = new RecordingService();
        await service.start();

        await service.close();

        expect(service.calls).toEqual(['listen', 'register', 'health', 'health-stop', 'deregister', 'drain', 'shutdown', 'handler-destroy']);
        expect(service.drainPhases).toEqual(['DRAINING']);
        expect(service.injector.get(ReadinessStateService).current).toBe('DOWN');
    });

    it('keeps shutting down when one step fails and rethrows the first error', async () => {
        const service = new RecordingService('health-stop');

        await expect(service.close()).rejects.toThrow('health stop failed');

        expect(service.calls).toEqual(['health-stop', 'deregister', 'drain', 'shutdown', 'handler-destroy']);
    });
});

describe('DefaultGracefulShutdownStrategy drain', () => {
    const health = {
        start: async () => undefined,
        stop: async () => undefined
    };

    it('waits for in-flight requests before resolving', async () => {
        const tracker = new InFlightTracker();
        const strategy = new DefaultGracefulShutdownStrategy({ enabled: true, drainTimeoutMs: 1000 }, health as any, tracker);
        const release = tracker.enter();

        let finished = false;
        const shutdown = strategy.shutdown().then(() => { finished = true; });

        await delay(10);
        expect(finished).toBe(false);
        expect(tracker.size).toBe(1);

        release();
        await shutdown;

        expect(finished).toBe(true);
        expect(tracker.size).toBe(0);
    });

    it('stops waiting when the drain deadline expires', async () => {
        const tracker = new InFlightTracker();
        const strategy = new DefaultGracefulShutdownStrategy({ enabled: true, drainTimeoutMs: 15 }, health as any, tracker);
        tracker.enter();

        const startedAt = Date.now();
        await strategy.shutdown();

        expect(Date.now() - startedAt).toBeGreaterThanOrEqual(10);
        // The stuck request is still counted, the transport close is left to
        // `onShutdown` (force close).
        expect(tracker.size).toBe(1);
    });

    it('does nothing when graceful shutdown is disabled', async () => {
        const tracker = new InFlightTracker();
        const calls: string[] = [];
        const strategy = new DefaultGracefulShutdownStrategy(
            { enabled: false, drainTimeoutMs: 1000 },
            { start: async () => undefined, stop: async () => { calls.push('stop'); } } as any,
            tracker
        );
        tracker.enter();

        await strategy.shutdown();

        expect(calls).toEqual([]);
        expect(tracker.size).toBe(1);
    });
});

describe('InFlightInterceptor', () => {
    it('tracks a request until it completes', async () => {
        const tracker = new InFlightTracker();
        const interceptor = new InFlightInterceptor(tracker);
        const context: any = {};
        const next: any = { handle: () => of('done') };

        const result$ = interceptor.intercept({} as any, next, context);
        expect(tracker.size).toBe(0);

        const result = await lastValueFrom(result$);

        expect(result).toBe('done');
        expect(tracker.size).toBe(0);
    });

    it('releases the request when the handler errors', async () => {
        const tracker = new InFlightTracker();
        const interceptor = new InFlightInterceptor(tracker);
        const next: any = { handle: (): Observable<any> => throwError(() => new Error('boom')) };

        await expect(lastValueFrom(interceptor.intercept({} as any, next, {} as any))).rejects.toThrow('boom');

        expect(tracker.size).toBe(0);
    });

    it('releases the request when the handler throws synchronously', async () => {
        const tracker = new InFlightTracker();
        const interceptor = new InFlightInterceptor(tracker);
        const next: any = { handle: () => { throw new Error('sync boom'); } };

        await expect(lastValueFrom(interceptor.intercept({} as any, next, {} as any))).rejects.toThrow('sync boom');

        expect(tracker.size).toBe(0);
    });

    it('keeps the request counted while the response is pending', async () => {
        const tracker = new InFlightTracker();
        const interceptor = new InFlightInterceptor(tracker);
        const next: any = {
            handle: () => new Observable(subscriber => {
                setTimeout(() => { subscriber.next('ok'); subscriber.complete(); }, 15);
            })
        };

        const result = lastValueFrom(interceptor.intercept({} as any, next, {} as any));
        expect(tracker.size).toBe(1);

        await result;
        expect(tracker.size).toBe(0);
    });
});
