import expect = require('expect');
import { Handler, HandlerFn, HandlerLike, NextOpter, HandleResult, TailNext } from '../src/handlers/handler';
import { composeHandlers, composeInterceptors, chainEndFn, toObservable, toPromise, invokeTail, invokeTails } from '../src/handlers/compose';
import { Interceptor, InterceptorFn, InterceptorLike } from '../src/handlers/interceptor';
import { Observable, of, from } from 'rxjs';
import { lastValueFrom } from 'rxjs';

describe('Handler Types and Interfaces', () => {

    describe('Handler', () => {
        it('should implement handler interface', () => {
            const handler: Handler<string, string> = {
                handle: (input: string, context: any) => `processed: ${input}`
            };
            expect(handler.handle('test', {})).toBe('processed: test');
        });

        it('should implement handler with equals', () => {
            const handler: Handler<string, string> & { id: string } = {
                handle: (input, context) => input,
                id: 'test'
            };
            handler.equals = (target: any) => target.id === handler.id;
            expect(handler.equals(handler)).toBeTruthy();
            expect(handler.equals({ id: 'other' })).toBeFalsy();
        });
    });

    describe('HandlerFn', () => {
        it('should be a function type', () => {
            const fn: HandlerFn<string, string> = (input, context) => `result: ${input}`;
            expect(fn('test', {})).toBe('result: test');
        });
    });

    describe('HandlerLike', () => {
        it('should accept HandlerFn', () => {
            const fn: HandlerLike = (input) => input;
            expect(typeof fn).toBe('function');
        });

        it('should accept Handler object', () => {
            const handler: HandlerLike = { handle: (input) => input };
            expect(typeof handler).toBe('object');
        });
    });

    describe('NextOpter', () => {
        it('should have next, error, finally callbacks', () => {
            const opter: NextOpter<string> = {
                next: (res) => res.toUpperCase(),
                error: (err) => 'error',
                finally: () => {}
            };
            expect(opter.next!('test')).toBe('TEST');
        });
    });
});

describe('Compose Functions', () => {

    describe('chainEndFn', () => {
        it('should call final handler', () => {
            const result = chainEndFn('input', (i) => `handled: ${i}`, {});
            expect(result).toBe('handled: input');
        });
    });

    describe('composeHandlers', () => {
        it('should compose single handler', () => {
            const handler: Handler<string, string> = {
                handle: (input) => `handled: ${input}`
            };
            const composed = composeHandlers([handler]);
            expect(composed('test', {})).toBe('handled: test');
        });

        it('should compose multiple handlers', () => {
            const handler1: HandlerFn = (input) => `${input}-step1`;
            const handler2: HandlerFn = (input) => `${input}-step2`;
            const composed = composeHandlers([handler1, handler2]);
            expect(composed('start', {})).toBe('start-step1-step2');
        });

        it('should compose empty handlers array', () => {
            const composed = composeHandlers([]);
            expect(composed('test', {})).toBe('test');
        });
    });

    describe('composeInterceptors', () => {
        it('should return chainEndFn for empty array', () => {
            const composed = composeInterceptors([]);
            expect(composed).toBe(chainEndFn);
        });

        it('should compose single interceptor function', () => {
            const interceptor: InterceptorFn = (input, next) => `intercepted: ${next(input, {})}`;
            const composed = composeInterceptors([interceptor]);
            expect(composed('test', (i) => i, {})).toBe('intercepted: test');
        });

        it('should compose single interceptor object', () => {
            const interceptor: Interceptor = {
                intercept: (input, next) => next.handle(`wrapped: ${input}`, {})
            };
            const composed = composeInterceptors([interceptor]);
            expect(composed('test', (i) => i, {})).toBe('wrapped: test');
        });
    });

    describe('toObservable', () => {
        it('should return Observable for Observable input', () => {
            const obs = of('test');
            const result = toObservable<string>(obs);
            expect(result).toBeInstanceOf(Observable);
        });

        it('should return Observable for Promise input', async () => {
            const promise = Promise.resolve('test');
            const result = toObservable<string>(promise);
            expect(result).toBeInstanceOf(Observable);
            const value = await lastValueFrom(result);
            expect(value).toBe('test');
        });

        it('should return Observable for sync value', async () => {
            const result = toObservable<string>('test');
            expect(result).toBeInstanceOf(Observable);
            const value = await lastValueFrom(result);
            expect(value).toBe('test');
        });
    });

    describe('toPromise', () => {
        it('should return Promise for Observable input', async () => {
            const obs = of('test');
            const result = await toPromise<string>(obs);
            expect(result).toBe('test');
        });

        it('should return Promise for Promise input', async () => {
            const promise = Promise.resolve('test');
            const result = await toPromise<string>(promise);
            expect(result).toBe('test');
        });

        it('should return Promise for sync value', async () => {
            const result = await toPromise<string>('test');
            expect(result).toBe('test');
        });
    });

    describe('invokeTail', () => {
        it('should process sync result', () => {
            const result = invokeTail(
                () => 'sync result',
                (res) => `${res} processed`
            );
            expect(result).toBe('sync result processed');
        });

        it('should process Promise result', async () => {
            const result = await invokeTail(
                () => Promise.resolve('async result'),
                (res) => `${res} processed`
            );
            expect(result).toBe('async result processed');
        });

        it('should process Observable result', async () => {
            const result = await lastValueFrom(invokeTail(
                () => of('observable result'),
                (res) => `${res} processed`
            ) as Observable<string>);
            expect(result).toBe('observable result processed');
        });

        it('should handle errors with error callback', () => {
            const result = invokeTail(
                () => { throw new Error('test error'); },
                {
                    error: (err) => `caught: ${(err as Error).message}`
                }
            );
            expect(result).toBe('caught: test error');
        });

        it('should call finally callback for sync', () => {
            let called = false;
            invokeTail(
                () => 'result',
                {
                    finally: () => { called = true; }
                }
            );
            expect(called).toBeTruthy();
        });
    });

    describe('invokeTails', () => {
        it('should chain multiple invokes', () => {
            const result = invokeTails(
                () => 'start',
                (res) => `${res}-step2`,
                (res) => `${res}-step1`
            );
            expect(result).toBe('start-step1-step2');
        });

        it('should work with single invoke', () => {
            const result = invokeTails(
                () => 'only'
            );
            expect(result).toBe('only');
        });
    });
});

describe('Interceptor Types', () => {

    describe('Interceptor interface', () => {
        it('should implement interceptor', () => {
            const interceptor: Interceptor<string, string> = {
                intercept: (input, next, context) => next.handle(input.toUpperCase(), context)
            };
            
            const handler: Handler<string, string> = {
                handle: (input) => `handled: ${input}`
            };
            
            const result = interceptor.intercept('test', handler, {});
            expect(result).toBe('handled: TEST');
        });
    });

    describe('InterceptorFn', () => {
        it('should be a function type', () => {
            const fn: InterceptorFn<string, string> = (input, next, context) => next(input.toUpperCase(), context);
            expect(fn('test', (i) => i, {})).toBe('TEST');
        });
    });

    describe('InterceptorLike', () => {
        it('should accept InterceptorFn', () => {
            const fn: InterceptorLike = (input, next) => next(input, {});
            expect(typeof fn).toBe('function');
        });

        it('should accept Interceptor object', () => {
            const interceptor: InterceptorLike = {
                intercept: (input, next) => next.handle(input, {})
            };
            expect(typeof interceptor).toBe('object');
        });
    });
});