import { Abstract } from '@tsdi/ioc';
import { DefaultInvocationHandler } from '@tsdi/core';
import { Incoming, ReadableLike, RequestContext } from '@tsdi/common';


/**
 * Route handler
 */
@Abstract()
export abstract class RouteHandler<TInput = ReadableLike<Incoming>, TOutput = any, TContext extends RequestContext = RequestContext> extends DefaultInvocationHandler<TInput, TOutput, TContext> {

}

