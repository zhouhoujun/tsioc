import { Type, Exception, getToken, Invocation } from '@tsdi/ioc';
import { InterceptorLike, normalizeConfigableHandlerOptions } from '@tsdi/core';
import { ForbiddenException, NotFoundException, RequestHandlerFn } from '@tsdi/common';
import { throwError } from 'rxjs';
import { AbstractRequestContext } from '../AbstractRequestContext';
import { RouteHandler } from '../router/route.handler';
import { RouteOptions } from '../router/route';




export class RouteHandlerImpl<TInput extends AbstractRequestContext = AbstractRequestContext, TOutput = any> extends RouteHandler<TInput, TOutput> {


    readonly route: string;
    constructor(invocation: Invocation, readonly options: RouteOptions, propertyKey?: string | symbol) {
        super(invocation, normalizeRouteOptions(invocation, options, propertyKey), propertyKey);
   
        this.route = options.path!;
    }


    protected override defaultRespond(ctx: TInput, res: any): void {
        if (ctx instanceof AbstractRequestContext) {
            ctx.body = res;
        }
    }

    protected override forbiddenError(): Exception {
        return new ForbiddenException()
    }
}

export function pathInterceptor(invocation: Invocation, route: RouteOptions) {

    return (input: AbstractRequestContext, next: RequestHandlerFn<AbstractRequestContext>, ctx?: any) => {
        if (route.paths && input.request.path) {
            if (Object.entries(route.paths).some(([key, value]) => {
                const filters: any[] = invocation.context.get(value, []);
                return !filters.length || !filters.includes(input.request.path[key])

            })) {
                return throwError(() => new NotFoundException())
            }
        }
        return next(input, ctx);
    }
}

function normalizeRouteOptions(invocation: Invocation, options: RouteOptions, propertyKey?: string | symbol) {
    if (options.interceptors || options.paths) {
        if (!options.interceptorsToken) {
            options.interceptorsToken = getToken<InterceptorLike[]>(invocation.type, (propertyKey?.toString() || ''))
        }
        if (options.paths) {
            options.interceptors = options.interceptors || [];
            options.interceptors.unshift(pathInterceptor(invocation, options));
        }
    }
    return options;
}


export function createRouteHandler<TInput, TClass extends RouteHandler, T>(
    invocation: Invocation<T>,
    options: RouteOptions<TInput>,
    propertyKey?: string | symbol,
    type?: Type<TClass>): TClass {
    const Hanlder = type ?? RouteHandlerImpl;
    normalizeConfigableHandlerOptions(options);
    return new Hanlder(invocation, options, propertyKey) as TClass;
}
