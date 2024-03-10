import { Class, DecorDefine, Injectable, Injector, isString, OnDestroy, ReflectiveRef, Token, tokenId, Type } from '@tsdi/ioc';
import { Backend, Handler, CanActivate, Interceptor, Filter, FnHandler, GuardHandler, setHandlerOptions, GuardHandlerOptions } from '@tsdi/core';
import { joinPath, normalize } from '@tsdi/common';
import { NotFoundExecption, PushDisabledExecption } from '@tsdi/common/transport';

import { lastValueFrom, throwError } from 'rxjs';
import { Middleware } from '../middleware/middleware';
import { RouteHandlerFactory, RouteHandlerFactoryResolver, RouteHandlerOptions } from './route.handler';
import { MappingDef, RouteMappingMetadata } from './router';
import { RequestContext } from '../RequestContext';
import { RequestHandler } from '../RequestHandler';


export const CTRL_INTERCEPTORS = tokenId<Interceptor[]>('CTRL_INTERCEPTORS');
export const CTRL_GUARDS = tokenId<CanActivate[]>('CTRL_GUARDS');
export const CTRL_FILTERS = tokenId<Filter[]>('CTRL_FILTERS');

/**
 * Controller route.
 * 
 * 控制器路由终端
 */
export class ControllerRoute<T> extends GuardHandler<RequestContext, any, RouteHandlerOptions> implements Middleware<RequestContext>, OnDestroy {

    private routes: Map<string, Handler>;
    protected sortRoutes: DecorDefine<RouteMappingMetadata>[];
    readonly prefix: string;

    constructor(readonly factory: RouteHandlerFactory<any>, options: RouteHandlerOptions) {
        super(factory.typeRef.getContext(), options);
        this.routes = new Map();

        const mapping = factory.typeRef.class.getAnnotation<MappingDef>();
        this.prefix = joinPath(options.prefix, mapping.prefix, mapping.version, mapping.route);
        setHandlerOptions(this, mapping);
        this.sortRoutes = factory.typeRef.class.defs
            .filter(m => m && m.decorType === 'method' && isString((m.metadata as RouteMappingMetadata).route))
            .sort((ra, rb) => (ra.metadata.route || '').length - (rb.metadata.route || '').length) as DecorDefine<RouteMappingMetadata>[];

        factory.onDestroy(this);
    }
    
    protected override initOptions(options: GuardHandlerOptions<any>): GuardHandlerOptions<any> {
        return {
            interceptorsToken: CTRL_INTERCEPTORS,
            guardsToken: CTRL_GUARDS,
            filtersToken: CTRL_FILTERS,
            ...options
        }
    }

    get ctrlRef() {
        return this.factory?.typeRef;
    }

    async invoke(ctx: RequestContext, next: () => Promise<void>): Promise<void> {
        await lastValueFrom(this.handle(ctx));
        if (next) await next();
    }

    protected getBackend(): Backend<RequestContext, any> {
        return new FnHandler((ctx) => {
            if (ctx.sent) return throwError(() => new PushDisabledExecption());

            const method = this.getRouteMetaData(ctx) as DecorDefine<RouteMappingMetadata>;
            if (!method || !method.propertyKey) {
                return throwError(() => new NotFoundExecption());
            }

            let handler = this.routes.get(method.propertyKey);
            if (!handler) {
                const prefix = this.prefix;

                const metadata = method.metadata as RouteMappingMetadata;
                handler = this.factory.create(method.propertyKey, { ...metadata, prefix });
                this.routes.set(method.propertyKey, handler);

            }
            return handler.handle(ctx);
        })
    }

    protected clear() {
        this.routes.clear();
        super.clear();
        this.factory.typeRef.onDestroy();
        (this as any).factory = null!;
    }

    protected getRouteMetaData(ctx: RequestContext) {
        const subRoute = normalize(ctx.url, this.prefix, true);

        return this.sortRoutes.find(m => m
            && m.metadata.method === ctx.method
            && ((m.metadata.route || '') === subRoute || (m.metadata.regExp && m.metadata.regExp.test(subRoute))))
    }
}

@Injectable()
export class ControllerRouteReolver {
    /**
    * resolve handler factory.
    * @param type ReflectiveRef
    * @param injector injector
    * @param prefix extenal prefix
    */
    resolve<T>(type: ReflectiveRef<T>, prefix?: string): ControllerRoute<T>;
    /**
     * resolve handler factory.
     * @param type factory type
     * @param injector injector
    * @param prefix extenal prefix
     */
    resolve<T>(type: Type<T> | Class<T>, injector: Injector, prefix?: string): ControllerRoute<T>;
    resolve<T>(type: Type<T> | Class<T> | ReflectiveRef<T>, arg2?: any, prefix?: string): ControllerRoute<T> {

        let injector: Injector;
        let factory: RouteHandlerFactory<T>;
        if (type instanceof ReflectiveRef) {
            injector = type.injector;
            factory = injector.get(RouteHandlerFactoryResolver).resolve(type);
        } else {
            injector = arg2;
            factory = injector.get(RouteHandlerFactoryResolver).resolve(type, injector);
        }

        return new ControllerRoute(factory, prefix);
    }
}