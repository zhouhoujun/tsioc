import { ClassType, Empty, Exception, getToken, Invocation } from '@tsdi/ioc';
import { ApplicationHandlerFn, ApplicationInterceptorLike, normalizeConfigableHandlerOptions } from '@tsdi/core';
import { ForbiddenException, NotFoundException } from '@tsdi/common/transport';
import { throwError } from 'rxjs';
import { RequestContext } from '../RequestContext';
import { RouteHandler } from '../router/route.handler';
import { RouteOptions } from '../router/route';




export class RouteHandlerImpl<TInput extends RequestContext = RequestContext, TOutput = any> extends RouteHandler<TInput, TOutput> {


    readonly route: string;
    constructor(invocation: Invocation, readonly options: RouteOptions, propertyKey?: string | symbol) {
        super(invocation, normalizeRouteOptions(invocation, options, propertyKey), propertyKey);
   
        this.route = options.path!;
    }


    protected override defaultRespond(ctx: TInput, res: any): void {
        if (ctx instanceof RequestContext) {
            ctx.body = res;
        }
    }

    protected override forbiddenError(): Exception {
        return new ForbiddenException()
    }
}

export function pathInterceptor(invocation: Invocation, route: RouteOptions) {

    return (input: RequestContext, next: ApplicationHandlerFn<RequestContext>, ctx?: any) => {
        if (route.paths && input.request.path) {
            if (Object.entries(route.paths).some(([key, value]) => {
                const filters: any[] = invocation.injector.get(value, Empty);
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
            options.interceptorsToken = getToken<ApplicationInterceptorLike[]>(invocation.type, (propertyKey?.toString() || ''))
        }
        if (options.paths) {
            options.interceptors = options.interceptors || [];
            options.interceptors.unshift(pathInterceptor(invocation, options));
        }
    }
    return options;
}

// const isRest = /(^:\w+)|(\/:\w+)/;
// const restParms = /^:\w+/;


export function createRouteHandler<TInput, TClass extends RouteHandler, T>(
    invocation: Invocation<T>,
    options: RouteOptions<TInput>,
    propertyKey?: string | symbol,
    type?: ClassType<TClass>): TClass {
    const Hanlder = type ?? RouteHandlerImpl;
    options = normalizeConfigableHandlerOptions(options);
    return new Hanlder(invocation, options, propertyKey) as TClass;
}
