import { createInjector, InjectUtil, Injectable, Injector } from '@tsdi/ioc';
import { AopModule, Aspect, Before, JoinPoint } from '../src';
import expect = require('expect');

const stats: { before: number; noArg: number; last?: JoinPoint; asyncLast?: JoinPoint } = { before: 0, noArg: 0 };

@Injectable()
class Worker {

    calls = 0;

    doWork(n: number) {
        this.calls++;
        return n + 1;
    }

    doAsync(n: number) {
        return Promise.resolve(n * 2);
    }

    doVoid() {
        this.calls++;
    }

    doThrow() {
        throw new Error('boom');
    }
}

@Injectable()
class NoArgWorker {

    doWork(n: number) {
        return n * 3;
    }
}

@Aspect({ static: true })
class LifecycleAspect {

    @Before('execution(Worker.doWork)')
    beforeWork(joinPoint: JoinPoint) {
        stats.before++;
        stats.last = joinPoint;
    }

    @Before('execution(Worker.doAsync)')
    beforeAsync(joinPoint: JoinPoint) {
        stats.asyncLast = joinPoint;
    }

    @Before('execution(Worker.doVoid)')
    beforeVoid(joinPoint: JoinPoint) {
        stats.last = joinPoint;
    }

    @Before('execution(Worker.doThrow)')
    beforeThrow(joinPoint: JoinPoint) {
        stats.last = joinPoint;
    }

    @Before('execution(NoArgWorker.doWork)')
    beforeNoArg() {
        stats.noArg++;
    }
}

function createContainer() {
    const container = createInjector();
    InjectUtil.use(container, AopModule);
    InjectUtil.register(container, LifecycleAspect, Worker, NoArgWorker);
    return container;
}

describe('AOP joinpoint lifecycle', () => {

    it('still runs advice and returns the method result', () => {
        const container = createContainer();
        const worker = container.get(Worker);
        const before = stats.before;

        expect(worker.doWork(1)).toBe(2);
        expect(stats.before).toBe(before + 1);
        expect(worker.calls).toBe(1);

        container.destroy();
    });

    it('runs an advice method that declares no parameters', () => {
        const container = createContainer();
        const worker = container.get(NoArgWorker);
        const before = stats.noArg;

        expect(worker.doWork(2)).toBe(6);
        expect(worker.doWork(3)).toBe(9);
        expect(stats.noArg).toBe(before + 2);

        container.destroy();
    });

    it('destroys the joinpoint once a synchronous call settles', () => {
        const container = createContainer();
        const worker = container.get(Worker);

        worker.doWork(1);

        expect(stats.last).toBeDefined();
        expect(stats.last!.destroyed).toBe(true);

        container.destroy();
    });

    it('keeps void methods returning undefined', () => {
        const container = createContainer();
        const worker = container.get(Worker);

        expect(worker.doVoid()).toBeUndefined();
        expect(stats.last!.destroyed).toBe(true);

        container.destroy();
    });

    it('destroys the joinpoint when the advised method throws', () => {
        const container = createContainer();
        const worker = container.get(Worker);

        expect(() => worker.doThrow()).toThrow('boom');
        expect(stats.last!.destroyed).toBe(true);

        container.destroy();
    });

    it('destroys the joinpoint after an async call settles', async () => {
        const container = createContainer();
        const worker = container.get(Worker);

        expect(await worker.doAsync(2)).toBe(4);
        expect(stats.asyncLast).toBeDefined();
        expect(stats.asyncLast!.destroyed).toBe(true);

        container.destroy();
    });

    it('does not register a destroy callback per advised call', () => {
        const container = createContainer();
        const worker = container.get(Worker);
        const callbacks = (container as unknown as { _dsryCbs: Set<unknown> })._dsryCbs;

        worker.doWork(1);
        const baseline = callbacks.size;

        for (let i = 0; i < 500; i++) {
            worker.doWork(i);
        }

        expect(callbacks.size).toBe(baseline);
        expect(worker.calls).toBe(501);

        container.destroy();
    });

    it('does not keep advised calls registered in the runtime', () => {
        const container = createContainer();
        const runtime = container.getRuntime();
        const worker = container.get(Worker);

        worker.doWork(1);
        const injectors = runtime.getRegisterIn(Worker);
        const callbacks = (container as unknown as { _dsryCbs: Set<unknown> })._dsryCbs;
        const baseline = callbacks.size;

        for (let i = 0; i < 500; i++) {
            worker.doWork(i);
        }

        expect(runtime.getRegisterIn(Worker)).toBe(injectors);
        expect(callbacks.size).toBe(baseline);

        container.destroy();
    });

    it('keeps the container usable after many advised calls', () => {
        const container = createContainer();
        const worker = container.get(Worker);

        for (let i = 0; i < 200; i++) {
            worker.doWork(i);
        }

        const other = createInjector(container, []);
        expect(other.get(Worker)).toBeDefined();
        other.destroy();

        expect(container.destroyed).toBe(false);
        expect(container.get(Worker)).toBeDefined();
        expect(worker.calls).toBe(200);

        container.destroy();
    });

});
