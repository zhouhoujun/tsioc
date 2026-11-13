import { ArgumentException, Injector } from '@tsdi/ioc';
import { RequestContext, RequestHandlerFn, RequestInterceptorFn } from '@tsdi/common';
import { catchError, defer, from, isObservable, mergeMap, Observable, throwError } from 'rxjs';
import { ClientDiscoveryStrategy } from '../strategies/ClientDiscoveryStrategy';
import { ClientLoadBalanceStrategy } from '../strategies/LoadBalanceStrategy';
import { CircuitBreakerStrategy } from '../strategies/CircuitBreakerStrategy';
import { RetryStrategy } from '../strategies/RetryStrategy';
import { CLIENT_DISCOVERED_ENDPOINTS, CLIENT_SELECTED_ENDPOINT } from '../tokens';
import { ClientEndpoint } from '../options';

function getInjector(context: RequestContext): Injector {
    const injector = context.getInjector?.();
    if (!injector) {
        throw new ArgumentException('request context injector is required.');
    }
    return injector;
}

function getStrategy<T>(context: RequestContext, token: any): T | null {
    return getInjector(context).get(token, null);
}

function resolveMaybeObservable<T>(value: Promise<T> | Observable<T> | T): Observable<T> {
    return isObservable(value) ? value : from(Promise.resolve(value as T));
}

export const discoverInterceptor: RequestInterceptorFn = (input: any, next: RequestHandlerFn, context: RequestContext) => {
    const strategy = getStrategy<ClientDiscoveryStrategy>(context, ClientDiscoveryStrategy);
    if (!strategy) {
        return next(input, context);
    }
    return defer(() => resolveMaybeObservable(strategy.discover(input, context))).pipe(
        mergeMap(endpoints => {
            if (Array.isArray(endpoints)) {
                context.set(CLIENT_DISCOVERED_ENDPOINTS, endpoints);
            }
            return next(input, context);
        })
    );
};

export const loadBalanceInterceptor: RequestInterceptorFn = (input: any, next: RequestHandlerFn, context: RequestContext) => {
    const strategy = getStrategy<ClientLoadBalanceStrategy>(context, ClientLoadBalanceStrategy);
    if (!strategy) {
        return next(input, context);
    }
    const endpoints = context.has?.(CLIENT_DISCOVERED_ENDPOINTS)
        ? context.get<ClientEndpoint[]>(CLIENT_DISCOVERED_ENDPOINTS)
        : undefined;
    return defer(() => resolveMaybeObservable(strategy.chooseServer(endpoints, input, context))).pipe(
        mergeMap(endpoint => {
            if (endpoint) {
                context.set(CLIENT_SELECTED_ENDPOINT, endpoint);
            }
            return next(input, context);
        })
    );
};

export const circuitBreakerInterceptor: RequestInterceptorFn = (input: any, next: RequestHandlerFn, context: RequestContext) => {
    const strategy = getStrategy<CircuitBreakerStrategy>(context, CircuitBreakerStrategy);
    if (!strategy) {
        return next(input, context);
    }
    if (strategy.isOpen()) {
        return throwError(() => strategy.getOpenError());
    }
    return next(input, context).pipe(
        catchError(err => {
            strategy.recordFailure();
            return throwError(() => strategy.isOpen() ? strategy.getOpenError() : err);
        }),
        mergeMap(value => {
            strategy.recordSuccess();
            return defer(() => [value]);
        })
    );
};

export const retryInterceptor: RequestInterceptorFn = (input: any, next: RequestHandlerFn, context: RequestContext) => {
    const strategy = getStrategy<RetryStrategy>(context, RetryStrategy);
    const stream = defer(() => next(input, context));
    return strategy ? strategy.retry(stream, input) : stream;
};
