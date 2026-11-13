import { Injector, Invocation, toObservable, token, toProvider, InjectUtil, InterceptorLike, InterceptorFn, composeInterceptors } from '@tsdi/ioc';
import { ResultValue, FilterLike, GuardLike, composeFilters } from '@tsdi/core';
import { MessageAdapter, RequestHandler, RequestContext, ReadableLike, Incoming, RestfulRequestAdapter, StatusMessageAdapter, REQUEST, ForbiddenException } from '@tsdi/common';
import { catchError, defer, from, isObservable, lastValueFrom, mergeMap, Observable, of, throwError, timeout } from 'rxjs';
import { ApiRateLimiter } from '../interceptors/ratelimiter';
import { ApiRateLimitOptions, ServiceOptions } from '../options';
import { SERV_OPTIONS } from '../tokens';

/**
 * route handler.
 */
export class RouteHandler implements RequestHandler {

    private invokeOpts?: { resolvers?: any[] };
    private routeTimeout?: number | false;
    private routeRateLimit?: ApiRateLimitOptions | false;
    private rateLimiter?: ApiRateLimiter;
    private guards?: GuardLike[];
    private interceptors?: InterceptorLike[];
    private filters?: FilterLike[];
    private chain?: InterceptorFn | null;

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
        this.guards = this.resolveFeature<GuardLike>(options?.guards, 'guards');
        this.interceptors = this.resolveFeature<InterceptorLike>(options?.interceptors, 'interceptors');
        this.filters = this.resolveFeature<FilterLike>(options?.filters, 'filters');
        // Pre-resolve global options for caching
        this.globalTimeout = this.resolveGlobalTimeout();
        this.globalRateLimit = this.resolveGlobalRateLimit();
    }

    handle(input: ReadableLike<Incoming>, context: RequestContext): Observable<any> {
        // Rate limit check
        this.applyRateLimit(input, context);

        const chain = this.getRouteChain();
        const invoke = () => this.applyTimeout(this.invokeController(input, context));
        if (!chain) {
            return this.applyGuards(input, context, invoke);
        }
        return this.applyGuards(input, context, () => chain(input, () => invoke(), context));
    }

    onDestroy(): void {
        this.rateLimiter?.destroy();
        this.globalRateLimiter?.destroy();
    }

    private invokeController(input: ReadableLike<Incoming>, context: RequestContext): Observable<any> {
        const result = this.invokeOpts
            ? this.invocation.invoke(this.propertyKey, {
                resolvers: this.invokeOpts.resolvers,
                payload: context.getPayload?.() ?? input,
                values: [
                    [REQUEST, context.get(REQUEST, null as any)],
                    [RestfulRequestAdapter, context.get(RestfulRequestAdapter)],
                    [MessageAdapter, context.get(MessageAdapter)],
                    [StatusMessageAdapter, context.get(StatusMessageAdapter)],
                ]
            } as any)
            : this.invocation.invoke(this.propertyKey, context);

        if (result instanceof ResultValue) {
            return toObservable(result).pipe(
                mergeMap((value: any) => toObservable(value.sendValue(context as any)))
            );
        }
        if (isObservable(result) || (result && typeof result.then === 'function')) {
            return toObservable(result).pipe(
                mergeMap((value: any) => value instanceof ResultValue
                    ? toObservable(value.sendValue(context as any))
                    : toObservable(value))
            );
        }
        return of(result);
    }

    private applyTimeout(stream: Observable<any>): Observable<any> {
        const timeoutMs = this.resolveTimeout();
        if (timeoutMs == null || timeoutMs === false) {
            return stream;
        }
        return stream.pipe(
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

    /**
     * Build the route-scoped filter/interceptor chain. Global filters and
     * interceptors are applied by the service handler around the router; this
     * chain only carries class/method metadata declared on the controller.
     */
    private getRouteChain(): InterceptorFn | null | undefined {
        if (this.chain !== undefined) {
            return this.chain;
        }
        const interceptors: InterceptorLike[] = [];
        if (this.filters?.length) {
            interceptors.push(composeFilters(this.filters) as InterceptorLike);
        }
        if (this.interceptors?.length) {
            interceptors.push(...this.interceptors);
        }
        this.chain = interceptors.length ? composeInterceptors(interceptors) : null;
        return this.chain;
    }

    private applyGuards(input: any, context: RequestContext, next: () => Observable<any>): Observable<any> {
        if (!this.guards?.length) {
            return next();
        }
        return defer(() => from(this.canHandle(input, context))).pipe(
            mergeMap(active => active ? next() : throwError(() => new ForbiddenException()))
        );
    }

    private async canHandle(input: any, context: RequestContext): Promise<boolean> {
        for (const guard of this.guards!) {
            const result = guard && typeof (guard as any).canHandle === 'function'
                ? (guard as any).canHandle(input, context)
                : (guard as any)(input, context);
            const active = isObservable(result) ? await lastValueFrom(result) : await result;
            if (active === false) {
                return false;
            }
        }
        return true;
    }

    private resolveFeature<T>(entries: any, kind: string): T[] | undefined {
        if (!entries || (Array.isArray(entries) && !entries.length)) {
            return undefined;
        }
        const list = Array.isArray(entries) ? entries : [entries];
        const tk = token<T[]>(`route-${kind}:${String(this.propertyKey)}`);
        InjectUtil.inject(this.injector, list.map(entry => toProvider(tk, entry, { multi: true })));
        return this.injector.get(tk, []) as T[];
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
            const rejection = limiter.rejection(input, context);
            const err = Object.assign(new Error(rejection.message), {
                statusCode: 429,
                statusMessage: 'Too Many Requests',
                headers: { 'Retry-After': String(Math.max(1, Math.ceil(rejection.retryAfterMs / 1000))) }
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
