import { ClassType, Exception, Invocation } from '@tsdi/ioc';
import { DefaultInvocationHandler, normalizeConfigableHandlerOptions } from '@tsdi/core';
import { normalize, patternToPath } from '@tsdi/common';
import { ForbiddenException } from '@tsdi/common/transport';
import { RequestContext } from '../RequestContext';
import { RouteHandler, RouteHandlerOptions } from '../router/route.handler';




export class RouteHandlerImpl<TInput extends RequestContext = RequestContext, TOutput = any> extends DefaultInvocationHandler<TInput, TOutput> implements RouteHandler {

    private _prefix: string;
    readonly route: string;
    constructor(invocation: Invocation, readonly options: RouteHandlerOptions = {}, propertyKey?: string | symbol) {
        super(invocation, options, propertyKey);
        this._prefix = options.prefix || '';
        this.route = patternToPath(options.route || '');
    }

    get prefix(): string {
        return this._prefix;
    }

    protected override beforeInvoke(ctx: TInput): void {
        if (this.route && isRest.test(this.route)) {
            const restParams: any = {};
            const routes = this.route.split('/').map(r => r.trim());
            const restParamNames = routes.filter(d => restParms.test(d));
            const routeUrls = normalize(ctx.originalUrl ?? ctx.url, this.prefix).split('/');
            let has = false;
            restParamNames.forEach(pname => {
                const val = routeUrls[routes.indexOf(pname)];
                if (val) {
                    has = true;
                    restParams[pname.substring(1)] = val
                }
            });
            if (has) {
                ctx.request.path = restParams;
            }
        }
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

const isRest = /(^:\w+)|(\/:\w+)/;
const restParms = /^:\w+/;


export function createRouteHandler<TInput, TClass extends RouteHandler, T>(
    invocation: Invocation<T>,
    options: RouteHandlerOptions<TInput>,
    propertyKey?: string | symbol,
    type?: ClassType<TClass>): TClass {
    const Hanlder = type ?? RouteHandlerImpl;
    options = normalizeConfigableHandlerOptions(options);
    return new Hanlder(invocation, options, propertyKey) as TClass;
}
