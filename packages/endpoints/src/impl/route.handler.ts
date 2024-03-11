import { Class, Execption, Injectable, Injector, OperationInvoker, ReflectiveFactory, ReflectiveRef, Type } from '@tsdi/ioc';
import { InvocationHandlerImpl } from '@tsdi/core';
import { normalize, patternToPath } from '@tsdi/common';
import { ForbiddenExecption } from '@tsdi/common/transport';
import { RequestContext } from '../RequestContext';
import { RouteHandler, RouteHandlerFactory, RouteHandlerFactoryResolver, RouteHandlerOptions } from '../router/route.handler';




export class RouteEndpointImpl<TInput extends RequestContext = RequestContext, TOutput = any> extends InvocationHandlerImpl<TInput, TOutput> implements RouteHandler {

    private _prefix: string;
    readonly route: string;
    constructor(invoker: OperationInvoker, readonly options: RouteHandlerOptions = {}) {
        super(invoker, options);
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

    protected override forbiddenError(): Execption {
        return new ForbiddenExecption()
    }
}

const isRest = /(^:\w+)|(\/:\w+)/;
const restParms = /^:\w+/;


@Injectable()
export class RoutehandlerFactoryImpl<T = any> extends RouteHandlerFactory<T> {

    constructor(readonly typeRef: ReflectiveRef<T>) {
        super()
    }

    create<TArg>(propertyKey: string, options?: RouteHandlerOptions<TArg>): RouteHandler {
        const endpoint = new RouteEndpointImpl(this.typeRef.createInvoker<TArg>(propertyKey, options), options);

        return endpoint;
    }

}

/**
 * Route factory resolver implements
 */
export class RouteHandlerFactoryResolverImpl extends RouteHandlerFactoryResolver {
    /**
     * resolve endpoint factory.
     * @param type factory type
     * @param injector injector
     * @param categare factory categare
     */
    resolve<T>(type: ReflectiveRef<T>): RouteHandlerFactory<T>;
    /**
     * resolve endpoint factory.
     * @param type factory type
     * @param injector injector
     * @param categare factory categare
     */
    resolve<T>(type: Type<T> | Class<T>, injector: Injector): RouteHandlerFactory<T>;
    resolve<T>(type: Type<T> | Class<T> | ReflectiveRef<T>, arg2?: any): RouteHandlerFactory<T> {
        let tyref: ReflectiveRef<T>;
        if (type instanceof ReflectiveRef) {
            tyref = type;
        } else {
            const injector = arg2 as Injector;
            tyref = injector.get(ReflectiveFactory).create(type, injector);
        }
        return new RoutehandlerFactoryImpl(tyref);
    }

}
