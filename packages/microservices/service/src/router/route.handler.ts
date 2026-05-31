import { Injector, Invocation, toObservable } from '@tsdi/ioc';
import { ResultValue } from '@tsdi/core';
import { RequestHandler, RequestContext, ReadableLike, Incoming } from '@tsdi/common';
import { mergeMap, Observable } from 'rxjs';

/**
 * route handler.
 */
export class RouteHandler implements RequestHandler {

    private invokeOpts?: { resolvers?: any[] };

    constructor(
        readonly injector: Injector,
        readonly invocation: Invocation,
        readonly propertyKey: string | symbol,
        options?: any
    ) {
        if (options?.resolvers) {
            this.invokeOpts = { resolvers: options.resolvers };
        }
    }

    handle(input: ReadableLike<Incoming>, context: RequestContext): Observable<any> {
        const result = this.invokeOpts
            ? this.invocation.invoke(this.propertyKey, {
                resolvers: this.invokeOpts.resolvers,
                payload: context.getPayload?.() ?? input
            } as any)
            : this.invocation.invoke(this.propertyKey, context);
        console.log('route.handler raw result:', this.propertyKey, result);
        return toObservable(result).pipe(
            mergeMap(value => {
                console.log('route.handler emitted value:', this.propertyKey, value);
                return toObservable(value instanceof ResultValue ? value.sendValue(context as any) : value);
            })
        );
    }
}

/**
 * create route handler from invocation.
 */
export function createRouteHandler(invocation: Invocation, options: any, propertyKey: string | symbol): RouteHandler {
    return new RouteHandler(invocation.injector, invocation, propertyKey, options);
}
