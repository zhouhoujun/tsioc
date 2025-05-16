import { Abstract, Token } from '@tsdi/ioc';
import { InvocationHandler, InvocationHandlerOptions } from '@tsdi/core';
import { Pattern } from '@tsdi/common';


/**
 * Route handler
 */
@Abstract()
export abstract class RouteHandler extends InvocationHandler<any, any, RouteHandlerOptions> {

    abstract options: RouteHandlerOptions;

    /**
     * route prefix.
     */
    abstract get prefix(): string;
}

/**
 * Route handler options.
 */
export interface RouteHandlerOptions<T = any> extends InvocationHandlerOptions<T> {
    /**
     * route
     */
    route?: Pattern;
    /**
     * route prefix
     */
    prefix?: string;
    /**
     * dynamic tokens for path of topic.  
     */
    paths?: Record<string, Token>;
}
