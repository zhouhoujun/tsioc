import { Injector, Invocation, toObservable } from '@tsdi/ioc';
import { ResultValue } from '@tsdi/core';
import { MessageAdapter, RequestHandler, RequestContext, ReadableLike, Incoming, RestfulRequestAdapter, StatusMessageAdapter } from '@tsdi/common';
import { catchError, mergeMap, Observable, throwError, timeout } from 'rxjs';
import { ApiRateLimiter } from '../interceptors/ratelimiter';
import { ApiRateLimitOptions, ServiceOptions } from '../options';
import { SERV_OPTIONS } from '../provider';

/**
 * route handler.
 */
export class RouteHandler implements RequestHandler {

    private invokeOpts?: { resolvers?: any[] };
    private routeTimeout?: number | false;
    private routeRateLimit?: ApiRateLimitOptions | false;
    private rateLimiter?: ApiRateLimiter;

    constructor(
        readonly injector: Injector,
        readonly invocation: Invocation,
        readonly propertyKey: string | symbol,
        options?: any
    ) {
        if (options?.resolvers) {
            this.invokeOpts = { resolvers: options.resolvers };
        }
        if (options?.timeout != null) {
            this.routeTimeout = options.timeout;
        }
        if (options?.rateLimit != null) {
            this.routeRateLimit = options.rateLimit;
            if (typeof options.rateLimit === 'object') {
                this.rateLimiter = new ApiRateLimiter(options.rateLimit);
            }
        }
        // Pre-resolve global options for caching
        this.globalTimeout = this.resolveGlobalTimeout();
        this.globalRateLimit = this.resolveGlobalRateLimit();
    }

    handle(input: ReadableLike<Incoming>, context: RequestContext): Observable<any> {
        // Rate limit check
        this.applyRateLimit(input, context);

        const result = this.invokeOpts
            ? this.invocation.invoke(this.propertyKey, {
                resolvers: this.invokeOpts.resolvers,
                payload: context.getPayload?.() ?? input,
                values: [
                    [RestfulRequestAdapter, context.get(RestfulRequestAdapter)],
                    [MessageAdapter, context.get(MessageAdapter)],
                    [StatusMessageAdapter, context.get(StatusMessageAdapter)],
                ]
            } as any)
            : this.invocation.invoke(this.propertyKey, context);

        let stream = toObservable(result).pipe(
            mergeMap(value => {
                return toObservable(value instanceof ResultValue ? value.sendValue(context as any) : value);
            })
        );

        // Apply timeout
        const timeoutMs = this.resolveTimeout();
        if (timeoutMs != null && timeoutMs !== false) {
            stream = stream.pipe(
                timeout(timeoutMs),
                catchError(err => {
                    if (err.name === 'TimeoutError') {
                        return throwError(() => Object.assign(new Error('API timeout'), {
                            statusCode: 504,
                            statusMessage: 'API Timeout',
                            expose: true
                        }));
                    }
                    return throwError(() => err);
                })
            );
        }

        return stream;
    }

    onDestroy(): void {
        this.rateLimiter?.destroy();
        this.globalRateLimiter?.destroy();
    }

    private globalTimeout: number | undefined;
    private globalRateLimit: ApiRateLimitOptions | undefined;
    private globalRateLimiter?: ApiRateLimiter;

    private applyRateLimit(input: any, context: RequestContext): boolean {
        const rateLimitOpts = this.routeRateLimit ?? this.globalRateLimit;
        if (!rateLimitOpts) {
            return true;
        }

        const limiter = this.rateLimiter ?? this.getGlobalRateLimiter(rateLimitOpts);
        if (!limiter) {
            return true;
        }

        if (!limiter.check(input, context)) {
            const message = rateLimitOpts.message ?? 'Too many requests';
            const err = Object.assign(new Error(message), {
                statusCode: 429,
                statusMessage: 'Too Many Requests',
                headers: { 'Retry-After': String(Math.ceil((rateLimitOpts.windowMs ?? 60000) / 1000)) }
            });
            throw err;
        }
        return true;
    }

    private resolveTimeout(): number | false | undefined {
        if (this.routeTimeout != null) {
            return this.routeTimeout;
        }
        return this.globalTimeout;
    }

    private resolveGlobalTimeout(): number | undefined {
        const opts = this.injector.get(SERV_OPTIONS, null) as ServiceOptions | null;
        return opts?.features?.timeout;
    }

    private resolveGlobalRateLimit(): ApiRateLimitOptions | undefined {
        const opts = this.injector.get(SERV_OPTIONS, null) as ServiceOptions | null;
        const global = opts?.features?.rateLimit;
        if (global && typeof global === 'object') {
            return global;
        }
        if (global) {
            return { limit: 100, windowMs: 60000 };
        }
        return undefined;
    }

    private getGlobalRateLimiter(opts: ApiRateLimitOptions): ApiRateLimiter {
        if (!this.globalRateLimiter) {
            this.globalRateLimiter = new ApiRateLimiter(opts);
        }
        return this.globalRateLimiter;
    }
}

/**
 * create route handler from invocation.
 */
export function createRouteHandler(invocation: Invocation, options: any, propertyKey: string | symbol): RouteHandler {
    return new RouteHandler(invocation.injector, invocation, propertyKey, options);
}
