import { Abstract } from '@tsdi/ioc';
import { DefaultInvocationHandler } from '@tsdi/core';
// import { RouteOptions } from './route';
import { RequestContext } from '@tsdi/common';


/**
 * Route handler
 */
@Abstract()
export abstract class RouteHandler<TInput = any, TOutput = any, TContext extends RequestContext = RequestContext> extends DefaultInvocationHandler<TInput, TOutput, TContext> {

    // abstract options: RouteOptions;

}

