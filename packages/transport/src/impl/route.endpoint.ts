import { Class, Injectable, Injector, OperationInvoker, ReflectiveFactory, ReflectiveRef, Type } from '@tsdi/ioc';
import { normalize, patternToPath } from '@tsdi/common';
import { OperationEndpointImpl } from '@tsdi/core';
import { AssetContext } from '../AssetContext';
import { RouteEndpoint, RouteEndpointFactory, RouteEndpointFactoryResolver, RouteEndpointOptions } from '../router/route.endpoint';



export class RouteEndpointImpl<TInput extends AssetContext = AssetContext, TOutput = any> extends OperationEndpointImpl<TInput, TOutput> implements RouteEndpoint {

    private _prefix: string;
    readonly route: string;
    constructor(invoker: OperationInvoker, readonly options: RouteEndpointOptions = {}) {
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
                ctx.payload.param = restParams;
            }
        }
    }

    protected override defaultRespond(ctx: TInput, res: any): void {
        if (ctx instanceof AssetContext) {
            ctx.body = res;
        }
    }
}

const isRest = /(^:\w+)|(\/:\w+)/;
const restParms = /^:\w+/;


@Injectable()
export class RouteEndpointFactoryImpl<T = any> extends RouteEndpointFactory<T> {

    constructor(readonly typeRef: ReflectiveRef<T>) {
        super()
    }

    create<TArg>(propertyKey: string, options?: RouteEndpointOptions<TArg>): RouteEndpoint {
        const endpoint = new RouteEndpointImpl(this.typeRef.createInvoker<TArg>(propertyKey, options), options);

        return endpoint;
    }

}

/**
 * Route factory resolver implements
 */
export class RouteEndpointFactoryResolverImpl extends RouteEndpointFactoryResolver {
    /**
     * resolve endpoint factory.
     * @param type factory type
     * @param injector injector
     * @param categare factory categare
     */
    resolve<T>(type: ReflectiveRef<T>): RouteEndpointFactory<T>;
    /**
     * resolve endpoint factory.
     * @param type factory type
     * @param injector injector
     * @param categare factory categare
     */
    resolve<T>(type: Type<T> | Class<T>, injector: Injector): RouteEndpointFactory<T>;
    resolve<T>(type: Type<T> | Class<T> | ReflectiveRef<T>, arg2?: any): RouteEndpointFactory<T> {
        let tyref: ReflectiveRef<T>;
        if (type instanceof ReflectiveRef) {
            tyref = type;
        } else {
            const injector = arg2 as Injector;
            tyref = injector.get(ReflectiveFactory).create(type, injector);
        }
        return new RouteEndpointFactoryImpl(tyref);
    }

}
