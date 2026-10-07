import { EnvironmentInjector, Exception, Injectable, InjectUtil, assertNotDestroyed, createInjector } from '@tsdi/ioc';
import expect = require('expect');

/**
 * Guards the `assertNotDestroyed` contract.
 *
 * `assertNotDestroyed` is the single mechanism that turns "use after destroy"
 * into a loud failure instead of silent undefined behaviour. It currently has
 * zero test coverage, which makes it tempting to "fix" a destroyed-injector
 * crash by weakening or deleting the guard. These tests lock the contract so
 * that such a change fails loudly instead.
 *
 * The thrown message shape is asserted on purpose: downstream crash triage
 * (and the agent console error inspector) rely on
 * `<TypeName> has already been destroyed.`
 */

const TOKEN = 'destroyed-guard-token';

@Injectable()
class GuardService {
    read(): string {
        return 'ok';
    }
}

class InvokableTarget {
    m(): number {
        return 1;
    }
}

describe('destroyed injector guard', () => {

    let inj: EnvironmentInjector;

    beforeEach(() => {
        inj = createInjector([
            GuardService,
            { provide: TOKEN, useValue: 'hello' }
        ]);
    });

    /**
     * Every entry point that must refuse to operate on a destroyed injector.
     * Keep this list in sync with the `assertNotDestroyed` call sites in
     * `src/impl/injector.ts`.
     */
    const guarded: Array<[string, () => unknown]> = [
        ['Injector.has', () => inj.has(TOKEN)],
        ['Injector.get', () => inj.get(TOKEN)],
        ['Injector.setValue', () => inj.setValue(TOKEN, 'v')],
        ['InjectUtil.resolve', () => InjectUtil.resolve(inj, TOKEN)],
        ['InjectUtil.setValue', () => InjectUtil.setValue(inj, TOKEN, 'v')],
        ['InjectUtil.cache', () => InjectUtil.cache(inj, TOKEN, 'v', 1000)],
        ['InjectUtil.inject', () => InjectUtil.inject(inj)],
        ['InjectUtil.register', () => InjectUtil.register(inj, GuardService)],
        ['InjectUtil.unregister', () => InjectUtil.unregister(inj, TOKEN)],
        ['InjectUtil.invoke', () => InjectUtil.invoke(inj, new InvokableTarget(), 'm')],
        ['assertNotDestroyed', () => assertNotDestroyed(inj)]
    ];

    describe('while alive', () => {

        it('should not report destroyed', () => {
            expect(inj.destroyed).toBeFalsy();
        });

        it('should serve registered providers', () => {
            expect(inj.has(TOKEN)).toBeTruthy();
            expect(inj.get(TOKEN)).toBe('hello');
        });

        it('should not throw from the guarded entry points', () => {
            const failures: string[] = [];
            for (const [name, call] of guarded) {
                try {
                    call();
                } catch (e) {
                    failures.push(`${name} threw while alive: ${(e as Error).message}`);
                }
            }
            expect(failures).toEqual([]);
        });

        it('should not throw from assertNotDestroyed', () => {
            expect(() => assertNotDestroyed(inj)).not.toThrow();
        });
    });

    describe('after destroy', () => {

        beforeEach(() => {
            inj.destroy();
        });

        it('should report destroyed', () => {
            expect(inj.destroyed).toBeTruthy();
        });

        it('should be idempotent', () => {
            expect(() => inj.destroy()).not.toThrow();
            expect(inj.destroyed).toBeTruthy();
        });

        it('should refuse every guarded entry point with the destroy message', () => {
            const failures: string[] = [];
            for (const [name, call] of guarded) {
                try {
                    call();
                    failures.push(`${name} did not throw after destroy`);
                } catch (e) {
                    expect(e instanceof Exception).toBeTruthy();
                    const message = (e as Error).message || '';
                    if (!/\S+ has already been destroyed\.$/.test(message)) {
                        failures.push(`${name} threw an unexpected message: ${message}`);
                    }
                }
            }
            expect(failures).toEqual([]);
        });

        it('should keep the message stable for crash triage', () => {
            let message = '';
            try {
                inj.get(TOKEN);
            } catch (e) {
                message = (e as Error).message || '';
            }
            expect(message).toMatch(/has already been destroyed\.$/);
            expect(message).not.toMatch(/undefined/);
        });
    });
});
