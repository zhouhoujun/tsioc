import { Abstract } from '@tsdi/ioc';
import { DefaultInvocationHandler } from '@tsdi/core';
import { RouteOptions } from './route';


/**
 * Route handler
 */
@Abstract()
export abstract class RouteHandler<TInput = any, TOutput = any> extends DefaultInvocationHandler<TInput, TOutput, RouteOptions> {

    abstract options: RouteOptions;

}

