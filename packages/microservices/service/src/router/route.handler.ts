import { Injector, Invocation } from '@tsdi/ioc';
import { RequestHandler } from '@tsdi/common';
import { RequestContext } from '@tsdi/common';
import { ReadableLike, Incoming } from '@tsdi/common';
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
        // The invocation already has the injector, just pass the args
        return this.invocation.invoke(this.propertyKey, [context]) as any;
    }
}

/**
 * create route handler from invocation.
 */
export function createRouteHandler(invocation: Invocation, options: any, propertyKey: string | symbol): RouteHandler {
    return new RouteHandler(invocation.injector, invocation, propertyKey);
}
