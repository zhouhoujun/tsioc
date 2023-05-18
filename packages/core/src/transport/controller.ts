import { Class, DecorDefine, Injectable, Injector, isString, OnDestroy, ReflectiveRef, Token, Type } from '@tsdi/ioc';
import { lastValueFrom, throwError } from 'rxjs';
import { Backend } from '../Handler';
import { CanActivate, GUARDS_TOKEN } from '../guard';
import { Interceptor, INTERCEPTORS_TOKEN } from '../Interceptor';
import { Filter, FILTERS_TOKEN } from '../filters/filter';
import { FnHandler } from '../handlers/handler';
import { AbstractGuardHandler } from '../handlers/guards';
import { setHandlerOptions } from '../handlers/handler.service';
import { NotFoundExecption, PushDisabledExecption } from '../execptions';
import { Endpoint } from '../endpoints/endpoint';
import { joinprefix } from './route';
import { Middleware } from './middleware';
import { RouteEndpointFactory, RouteEndpointFactoryResolver } from './route.endpoint';
import { MappingDef, RouteMappingMetadata } from './router';
import { AssetContext } from './context';


/**
 * Controller route.
 * 
 * 控制器路由终端
 */
export class ControllerRoute<T> extends AbstractGuardHandler implements Middleware<AssetContext>, Endpoint, OnDestroy {

    private routes: Map<string, Endpoint>;
    protected sortRoutes: DecorDefine<RouteMappingMetadata>[] | undefined;
    readonly prefix: string;

    constructor(readonly factory: RouteEndpointFactory<T>,
        prefix?: string,
        protected interceptorsToken: Token<Interceptor[]> = INTERCEPTORS_TOKEN,
        protected guardsToken: Token<CanActivate[]> = GUARDS_TOKEN,
        protected filtersToken: Token<Filter[]> = FILTERS_TOKEN) {
        super(factory.typeRef.injector);
        this.routes = new Map();

        const mapping = factory.typeRef.class.getAnnotation<MappingDef>();
        prefix = this.prefix = joinprefix(prefix, mapping.prefix, mapping.version, mapping.route);
        setHandlerOptions(this, mapping);
        factory.onDestroy(this);
    }

    get ctrlRef() {
        return this.factory?.typeRef;
    }

    async invoke(ctx: AssetContext, next: () => Promise<void>): Promise<void> {
        await lastValueFrom(this.handle(ctx));
        if (next) await next();
    }

    protected getBackend(): Backend<AssetContext, any> {
        return new FnHandler((ctx) => {
            if (ctx.sent) return throwError(() => new PushDisabledExecption());

            const method = this.getRouteMetaData(ctx) as DecorDefine<RouteMappingMetadata>;
            if (!method || !method.propertyKey) {
                return throwError(() => new NotFoundExecption());
            }

            let endpoint = this.routes.get(method.propertyKey);
            if (!endpoint) {
                const prefix = this.prefix;

                const metadata = method.metadata as RouteMappingMetadata;
                endpoint = this.factory.create(method.propertyKey, { ...metadata, prefix });
                this.routes.set(method.propertyKey, endpoint);

            }
            return endpoint.handle(ctx);
        })
    }


    protected clear() {
        this.routes.clear();
        super.clear();
        this.factory.typeRef.onDestroy();
        (this as any).factory = null!;
    }



    protected getRouteMetaData(ctx: AssetContext) {
        const subRoute = ctx.url.replace(this.prefix, '') || '/';
        if (!this.sortRoutes) {
            this.sortRoutes = this.ctrlRef.class.defs
                .filter(m => m && m.decorType === 'method' && isString((m.metadata as RouteMappingMetadata).route))
                .sort((ra, rb) => (ra.metadata.route || '').length - (rb.metadata.route || '').length) as DecorDefine<RouteMappingMetadata>[]
        }

        return this.sortRoutes.find(m => m
            && m.metadata.method === ctx.method
            && ((m.metadata.route || '') === subRoute || (m.metadata.regExp && m.metadata.regExp.test(subRoute))))
    }
}

@Injectable()
export class ControllerRouteReolver {
    /**
    * resolve endpoint factory.
    * @param type ReflectiveRef
    * @param injector injector
    * @param prefix extenal prefix
    */
    resolve<T>(type: ReflectiveRef<T>, prefix?: string): ControllerRoute<T>;
    /**
     * resolve endpoint factory.
     * @param type factory type
     * @param injector injector
    * @param prefix extenal prefix
     */
    resolve<T>(type: Type<T> | Class<T>, injector: Injector, prefix?: string): ControllerRoute<T>;
    resolve<T>(type: Type<T> | Class<T> | ReflectiveRef<T>, arg2?: any, prefix?: string): ControllerRoute<T> {

        let injector: Injector;
        let factory: RouteEndpointFactory<T>;
        if (type instanceof ReflectiveRef) {
            injector = type.injector;
            factory = injector.get(RouteEndpointFactoryResolver).resolve(type);
        } else {
            injector = arg2;
            factory = injector.get(RouteEndpointFactoryResolver).resolve(type, injector);
        }

        return new ControllerRoute(factory, prefix);
    }
}