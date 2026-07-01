import { RequestContext, RequestHandlerFn, RequestInterceptorFn } from '@tsdi/common';
import { Injector } from '@tsdi/ioc';
import { defer, from, isObservable, mergeMap, of } from 'rxjs';
import { AbstractClient } from '../AbstractClient';
import { getClientToken } from '../tokens';
import { ClientConfig } from '../options';

function toObservableResult(result: unknown) {
    if (isObservable(result)) {
        return result;
    }
    if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
        return from(result as PromiseLike<unknown>);
    }
    return of(result);
}

function getInjector(context: RequestContext): Injector {
    return context.getInjector();
}

export function ensureClientConnectedInterceptor(config: ClientConfig): RequestInterceptorFn {
    return (input: any, next: RequestHandlerFn, context: RequestContext) => {
        const injector = getInjector(context);
        const client = injector.get(getClientToken(config), null) as (AbstractClient<any, any> & {
            connect?: () => unknown;
            initContext?: (context: RequestContext, req: any) => void;
        }) | null;

        if (!client || typeof client.connect !== 'function') {
            return next(input, context);
        }

        return defer(() => toObservableResult(client.connect!())).pipe(
            mergeMap(() => {
                if (typeof client.initContext === 'function') {
                    client.initContext(context, input);
                }
                return next(input, context);
            })
        );
    };
}
