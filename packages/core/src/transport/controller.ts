import { Class, DecorDefine, Injectable, Injector, isString, OnDestroy, ReflectiveRef, toProvider, Type } from '@tsdi/ioc';
import { lastValueFrom, Observable, throwError } from 'rxjs';
import { NotFoundExecption, PushDisabledExecption } from '../execptions';
import { getInterceptorsToken } from '../Interceptor';
import { EndpointContext } from '../endpoints/context';
import { Endpoint } from '../endpoints/endpoint';
import { getGuardsToken } from '../endpoints/endpoint.service';
import { joinprefix } from './route';
import { Context, Middleware } from './middleware';
import { RouteEndpointFactory, RouteEndpointFactoryResolver } from './route.endpoint';
import { MappingDef, RouteMappingMetadata } from './router';

const isRest = /\/:/;

/**
 * Controller route.
 */
export class ControllerRoute<T> implements Middleware, Endpoint, OnDestroy {

    private routes: Map<string, Endpoint>;
    protected sortRoutes: DecorDefine<RouteMappingMetadata>[] | undefined;
    readonly prefix: string;

    constructor(readonly factory: RouteEndpointFactory<T>, prefix?: string) {
        this.routes = new Map();

        const mapping = factory.typeRef.class.getAnnotation<MappingDef>();
        prefix = this.prefix = joinprefix(prefix, mapping.prefix, mapping.version, mapping.route);
        const injector = factory.typeRef.injector;
        mapping.pipes && injector.inject(mapping.pipes);
        mapping.guards && injector.inject(toProvider(getGuardsToken(prefix), mapping.guards));
        mapping.interceptors && injector.inject(toProvider(getInterceptorsToken(prefix), mapping.interceptors));
        mapping.filters && injector.inject(toProvider(getGuardsToken(prefix), mapping.filters));
        factory.onDestroy(this);
    }

    get ctrlRef() {
        return this.factory?.typeRef;
    }

    async invoke(ctx: EndpointContext<Context>, next: () => Promise<void>): Promise<void> {
        await lastValueFrom(this.handle(ctx));
        if (next) await next();
    }

    handle(ctx: EndpointContext<Context>): Observable<any> {

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
    }

    private _destroyed = false;
    onDestroy(): void {
        if (this._destroyed) return;
        this.clear();
    }


    protected clear() {
        this._destroyed = true;
        this.routes.clear();
        this.factory.typeRef.onDestroy();
        (this as any).factory = null!;
    }



    protected getRouteMetaData(ctx: EndpointContext<Context>) {
        const subRoute = ctx.payload.url.replace(this.prefix, '') || '/';
        if (!this.sortRoutes) {
            this.sortRoutes = this.ctrlRef.class.defs
                .filter(m => m && m.decorType === 'method' && isString((m.metadata as RouteMappingMetadata).route))
                .sort((ra, rb) => (rb.metadata.route || '').length - (ra.metadata.route || '').length) as DecorDefine<RouteMappingMetadata>[]

        }

        const allMethods = this.sortRoutes.filter(m => m && m.metadata.method === ctx.method);

        let meta = allMethods.find(d => (d.metadata.route || '') === subRoute);
        if (!meta) {
            meta = allMethods.find(route => {
                const uri = (route.metadata.route || '') as string;
                if (isRest.test(uri)) {
                    const idex = uri.indexOf('/:');
                    const url = uri.substring(0, idex);
                    if (url !== subRoute && subRoute.indexOf(url) === 0) {
                        return true
                    }
                }
                return false
            })
        }
        return meta
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