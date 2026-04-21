import { Type, Exception, Invocation } from '@tsdi/ioc';
import { RequestHandlerFn } from '@tsdi/common';
import { AbstractRequestContext } from '../AbstractRequestContext';
import { RouteHandler } from '../router/route.handler';
import { RouteOptions } from '../router/route';
export declare class RouteHandlerImpl<TInput extends AbstractRequestContext = AbstractRequestContext, TOutput = any> extends RouteHandler<TInput, TOutput> {
    readonly options: RouteOptions;
    readonly route: string;
    constructor(invocation: Invocation, options: RouteOptions, propertyKey?: string | symbol);
    protected forbiddenError(): Exception;
}
export declare function pathInterceptor(invocation: Invocation, route: RouteOptions): (input: AbstractRequestContext, next: RequestHandlerFn<AbstractRequestContext>, ctx?: any) => import("rxjs").Observable<any>;
export declare function createRouteHandler<TInput, TClass extends RouteHandler, T>(invocation: Invocation<T>, options: RouteOptions<TInput>, propertyKey?: string | symbol, type?: Type<TClass>): TClass;
