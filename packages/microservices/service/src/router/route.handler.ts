import { Injector, Invocation, toObservable } from '@tsdi/ioc';
import { RequestHandler, RequestContext, ReadableLike, Incoming } from '@tsdi/common';
import { Observable } from 'rxjs';

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
        return toObservable(result);
    }
}

/**
 * create route handler from invocation.
 */
export function createRouteHandler(invocation: Invocation, options: any, propertyKey: string | symbol): RouteHandler {
    return new RouteHandler(invocation.injector, invocation, propertyKey, options);
}
