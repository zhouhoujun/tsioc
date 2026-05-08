import { Injector, Invocation, toObservable } from '@tsdi/ioc';
import { RequestHandler, RequestContext, ReadableLike, Incoming } from '@tsdi/common';
import { Observable } from 'rxjs';

/**
 * route handler.
 */
export class RouteHandler implements RequestHandler {

    constructor(
        readonly injector: Injector,
        readonly invocation: Invocation,
        readonly propertyKey: string | symbol
    ) {
    }

    handle(input: ReadableLike<Incoming>, context: RequestContext): Observable<any> {
        const result = this.invocation.invoke(this.propertyKey, context);
        return toObservable(result);
    }
}

/**
 * create route handler from invocation.
 */
export function createRouteHandler(invocation: Invocation, options: any, propertyKey: string | symbol): RouteHandler {
    return new RouteHandler(invocation.injector, invocation, propertyKey);
}
