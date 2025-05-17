import { createContext, DecorDefine, Invocation, isString, OnDestroy, tokenId, Type } from '@tsdi/ioc';
import { ApplicationHandler, CanHandle, ApplicationInterceptor, Filter, setHandlerOptions, ConfigableHandler, BackendFn } from '@tsdi/core';
import { joinPath, normalize } from '@tsdi/common';
import { NotFoundException, PushDisabledException } from '@tsdi/common/transport';

import { lastValueFrom, throwError } from 'rxjs';
import { Middleware } from '../middleware/middleware';
import { RouteHandlerOptions } from './route.handler';
import { MappingDef, RouteMappingMetadata } from './router';
import { RequestContext } from '../RequestContext';
import { createRouteHandler } from '../impl/route.handler';


export const CTRL_INTERCEPTORS = tokenId<ApplicationInterceptor[]>('CTRL_INTERCEPTORS');
export const CTRL_GUARDS = tokenId<CanHandle[]>('CTRL_GUARDS');
export const CTRL_FILTERS = tokenId<Filter[]>('CTRL_FILTERS');

/**
 * Controller route.
 * 
 * 控制器路由终端
 */
export class ControllerRoute<T> extends ConfigableHandler<RequestContext, any, RouteHandlerOptions> implements Middleware<RequestContext>, OnDestroy {

    private routes: Map<string, ApplicationHandler>;
    protected sortRoutes: DecorDefine<RouteMappingMetadata>[];
    readonly prefix: string;

    constructor(readonly invocation: Invocation, options: RouteHandlerOptions = {}) {
        super(invocation.context, options);
        this.routes = new Map();

        const mapping = invocation.class.getAnnotation<MappingDef>();
        this.prefix = joinPath(options.prefix, mapping.prefix, mapping.version, mapping.route);
        setHandlerOptions(this, mapping);
        this.sortRoutes = invocation.class
            .getMethodDefines(m => m && isString((m.metadata as RouteMappingMetadata).route))
            .sort((ra, rb) => (ra.metadata.route || '').length - (rb.metadata.route || '').length) as DecorDefine<RouteMappingMetadata>[];

        invocation.onDestroy(this);
    }

    protected override initOptions(options: RouteHandlerOptions): RouteHandlerOptions {
        return {
            interceptorsToken: CTRL_INTERCEPTORS,
            guardsToken: CTRL_GUARDS,
            filtersToken: CTRL_FILTERS,
            ...options
        }
    }

    get class() {
        return this.invocation.class;
    }

    async invoke(ctx: RequestContext, next: () => Promise<void>): Promise<void> {
        await lastValueFrom(this.handle(ctx));
        if (next) await next();
    }

    protected getBackend(): BackendFn<RequestContext, any> {
        return (ctx) => {
            if (ctx.headersSent) return throwError(() => new PushDisabledException());

            const method = this.getRouteMetaData(ctx) as DecorDefine<RouteMappingMetadata>;
            if (!method || !method.propertyKey) {
                return throwError(() => new NotFoundException());
            }

            let handler = this.routes.get(method.propertyKey);
            if (!handler) {
                const prefix = this.prefix;

                const metadata = method.metadata as RouteMappingMetadata;
                handler = createRouteHandler(this.invocation, { ...metadata, prefix }, method.propertyKey);
                this.routes.set(method.propertyKey, handler);

            }
            return handler.handle(ctx);
        };
    }

    protected clear() {
        this.routes.clear();
        super.clear();
        this.invocation.onDestroy();
        (this as any).factory = null!;
    }

    protected getRouteMetaData(ctx: RequestContext) {
        const subRoute = normalize(ctx.url, this.prefix, true);

        return this.sortRoutes.find(m => m
            && (ctx.method == '*' || m.metadata.method === ctx.method)
            && (m.metadata.regExp ? m.metadata.regExp.test(subRoute) : m.metadata.route === subRoute))
    }
}

// @Injectable()
// export class ControllerRouteFactory {
//     /**
//     * create controller route handler.
//     * @param type ReflectiveRef
//     * @param injector injector
//     * @param prefix extenal prefix
//     */
//     create<T>(type: Invocation<T>, options?: RouteHandlerOptions): ControllerRoute<T>;
//     /**
//      * create ontroller route handler.
//      * @param type factory type
//      * @param injector injector
//     * @param prefix extenal prefix
//      */
//     create<T>(type: Type<T> | Class<T>, injector: Injector, options?: RouteHandlerOptions): ControllerRoute<T>;
//     /**
//      * create ontroller route handler.
//      * @param type factory type
//      * @param injector injector
//     * @param prefix extenal prefix
//      */
//     create<T>(type: Type<T> | Class<T>, injector: Injector, prefix?: string): ControllerRoute<T>;
//     create<T>(type: Type<T> | Class<T> | Invocation<T>, arg2?: any, arg3?: RouteHandlerOptions | string): ControllerRoute<T> {

//         let injector: Injector;
//         let factory: RouteHandlerFactory<T>;
//         const options = isString(arg3) ? { prefix: arg3 } : { ...arg3 };
//         if (type instanceof Invocation) {
//             injector = type.injector;
//             factory = injector.get(RouteHandlerFactoryResolver).resolve(type);
//         } else {
//             injector = arg2;
//             factory = injector.get(RouteHandlerFactoryResolver).resolve(type);
//         }

//         return new ControllerRoute(factory, options);
//     }
// }