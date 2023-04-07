import { Class, DecorDefine, Injectable, Injector, isString, OnDestroy, ReflectiveRef, Token, Type } from '@tsdi/ioc';
import { lastValueFrom, throwError } from 'rxjs';
import { NotFoundExecption, PushDisabledExecption } from '../execptions';
import { Endpoint } from '../endpoints/endpoint';
import { joinprefix } from './route';
import { Middleware } from './middleware';
import { RouteEndpointFactory, RouteEndpointFactoryResolver } from './route.endpoint';
import { MappingDef, RouteMappingMetadata } from './router';
import { AbstractGuardHandler } from '../handlers/guards';
import { Backend } from '../Handler';
import { FnHandler } from '../handlers';
import { Interceptor, INTERCEPTORS_TOKEN } from '../Interceptor';
import { CanActivate, GUARDS_TOKEN } from '../guard';
import { Filter, FILTERS_TOKEN } from '../filters/filter';
import { setOptions } from '../endpoints';
import { TransportContext } from './context';

const isRest = /\/:/;

/**
 * Controller route.
 */
export class ControllerRoute<T> extends AbstractGuardHandler implements Middleware<TransportContext>, Endpoint, OnDestroy {

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
        // const injector = factory.typeRef.injector;
        // mapping.pipes && injector.inject(mapping.pipes);
        // this.useGuards(mapping.guards ?? EMPTY);
        // injector.inject(toProvider(guardsToken, mapping.guards ?? EMPTY));
        // injector.inject(toProvider(interceptorsToken, mapping.interceptors));
        // mapping.filters && injector.inject(toProvider(filtersToken, mapping.filters));
        setOptions(this, mapping);
        factory.onDestroy(this);
    }

    get ctrlRef() {
        return this.factory?.typeRef;
    }

    async invoke(ctx: TransportContext, next: () => Promise<void>): Promise<void> {
        await lastValueFrom(this.handle(ctx));
        if (next) await next();
    }

    protected getBackend(): Backend<TransportContext, any> {
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



    protected getRouteMetaData(ctx: TransportContext) {
        const subRoute = ctx.url.replace(this.prefix, '') || '/';
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