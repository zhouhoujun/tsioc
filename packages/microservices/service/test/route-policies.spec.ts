import expect = require('expect');
import { createInjector, Injector, Interceptor, InterceptorLike, toObservable } from '@tsdi/ioc';
import { Filter } from '@tsdi/core';
import { ForbiddenException } from '@tsdi/common';
import { lastValueFrom, map } from 'rxjs';
import { RouteHandler } from '../src/router/route.handler';

function createInvocation(injector: Injector, result: any = 'ok') {
    return {
        injector,
        invoke: () => result
    } as any;
}

function createContext(injector: Injector): any {
    return {
        get: (tk: any, def?: any) => injector.has(tk) ? injector.get(tk) : def,
        getPayload: () => undefined
    };
}

class DenyGuard {
    canHandle() {
        return false;
    }
}

class AllowGuard {
    canHandle() {
        return true;
    }
}

class PrefixInterceptor implements Interceptor {
    intercept(input: any, next: any, context: any) {
        return toObservable(next.handle(input, context)).pipe(map((value: any) => `prefix:${value}`));
    }
}

class SuffixFilter extends Filter {
    doFilter(input: any, next: any, context: any) {
        return toObservable(next.handle(input, context)).pipe(map((value: any) => `${value}:suffix`));
    }
}

describe('route level policies', () => {

    it('blocks the handler when a route guard returns false', async () => {
        const injector = createInjector([DenyGuard]);
        const handler = new RouteHandler(injector, createInvocation(injector), 'read', { guards: [DenyGuard] });

        let error: any;
        try {
            await lastValueFrom(handler.handle({} as any, createContext(injector)));
        } catch (err) {
            error = err;
        }
        expect(error).toBeInstanceOf(ForbiddenException);
    });

    it('invokes the handler when the route guard allows it', async () => {
        const injector = createInjector([AllowGuard]);
        const handler = new RouteHandler(injector, createInvocation(injector, 'value'), 'read', { guards: [AllowGuard] });

        const result = await lastValueFrom(handler.handle({} as any, createContext(injector)));
        expect(result).toBe('value');
    });

    it('supports a guard function declared on the route', async () => {
        const injector = createInjector([]);
        const handler = new RouteHandler(injector, createInvocation(injector, 'value'), 'read', {
            guards: [() => false]
        });

        let error: any;
        try {
            await lastValueFrom(handler.handle({} as any, createContext(injector)));
        } catch (err) {
            error = err;
        }
        expect(error).toBeInstanceOf(ForbiddenException);
    });

    it('runs route interceptors and filters around the controller result', async () => {
        const injector = createInjector([PrefixInterceptor, SuffixFilter]);
        const handler = new RouteHandler(injector, createInvocation(injector, 'value'), 'read', {
            filters: [SuffixFilter],
            interceptors: [PrefixInterceptor]
        });

        const result = await lastValueFrom(handler.handle({} as any, createContext(injector)));
        expect(result).toBe('prefix:value:suffix');
    });

    it('accepts interceptor and filter functions', async () => {
        const injector = createInjector([]);
        const interceptor: InterceptorLike = (input: any, next: any, context: any) =>
            toObservable(next(input, context)).pipe(map((value: any) => `fn:${value}`));
        const handler = new RouteHandler(injector, createInvocation(injector, 'value'), 'read', {
            interceptors: [interceptor]
        });

        const result = await lastValueFrom(handler.handle({} as any, createContext(injector)));
        expect(result).toBe('fn:value');
    });

    it('keeps rate limiting and timeout for routes with policies', async () => {
        const injector = createInjector([AllowGuard]);
        const handler = new RouteHandler(injector, createInvocation(injector, 'value'), 'read', {
            guards: [AllowGuard],
            timeout: 2000,
            rateLimit: { limit: 1, windowMs: 60000 }
        });

        const context = createContext(injector);
        expect(await lastValueFrom(handler.handle({} as any, context))).toBe('value');
        let error: any;
        try {
            await lastValueFrom(handler.handle({} as any, context));
        } catch (err) {
            error = err;
        }
        expect(error?.statusCode).toBe(429);
    });
});
