import { InjectFlags, Injector, Module, ModuleWithProviders, Token, getToken, isString, tokenId } from '@tsdi/ioc';
import { ROUTES, Routes } from './route';
import { RouteMatcher, Router } from './router';
import { MIDDLEEARE_ENDPOINT_IMPL, TRANSPORT_ENDPOINT_IMPL } from './endpoint';
import { MappingRouter, DefaultRouteMatcher } from './router.mapping';
import { HybridRouter } from './router.hybrid';
import { ControllerRouteReolver } from './controller';
import { RouteEndpointFactoryResolver } from './route.endpoint';
import { RouteEndpointFactoryResolverImpl } from '../impl/route.endpoint';
import { TransportContextIml } from '../impl/transport.context';
import { TransportEndpointImpl } from '../impl/transport.endpoint';
import { MiddlewareEndpointImpl } from '../impl/middleware.endpoint';
import { TRANSPORT_CONTEXT_IMPL } from './context';
import { MESSAGE_ROUTERS, MessageRouter, MircoServiceRouter } from './router.micro';
import { MessageRouterImpl, MircoServiceRouterImpl } from '../impl/micro.router';
import { Protocol } from './protocols';



TRANSPORT_ENDPOINT_IMPL.create = (injector, options) => new TransportEndpointImpl(injector, options);

TRANSPORT_CONTEXT_IMPL.create = (injector, options) => new TransportContextIml(injector, options);

MIDDLEEARE_ENDPOINT_IMPL.create = (injector, options) => new MiddlewareEndpointImpl(injector, options);


/**
 * global router prefix.
 */
export const ROUTER_PREFIX = tokenId<string>('ROUTER_PREFIX');

/*
 * Router module.
 */
@Module({
    providers: [
        { provide: RouteMatcher, useClass: DefaultRouteMatcher, asDefault: true },
        { provide: RouteEndpointFactoryResolver, useValue: new RouteEndpointFactoryResolverImpl() },
        {
            provide: HybridRouter,
            useFactory: (injector: Injector, matcher: RouteMatcher, prefix?: string, routes?: Routes) => {
                return new MappingRouter(injector, matcher, prefix, routes)
            },
            deps: [
                Injector,
                RouteMatcher,
                [ROUTER_PREFIX, InjectFlags.Optional],
                [ROUTES, InjectFlags.Optional, InjectFlags.Self]
            ]
        },
        { provide: Router, useExisting: HybridRouter },
        ControllerRouteReolver
    ]
})
export class RouterModule {

    /**
     * Creates a module with all the router directives and a provider registering routes,
     * without creating a new Router service.
     * When registering for submodules and lazy-loaded submodules, create the Module as follows:
     *
     * @usageNotes
     * 
     * #### Examples:
     * 
     * module examples.
     * 
     * ```ts
     * 
     * @Module({
     *   imports: [RouterModule.forChild(ROUTES)]
     * })
     * class MyNgModule {}
     * 
     * ```
     *
     * @param routes An array of `Route` objects that define the navigation paths for the submodule.
     * @return The new Module.
     *
     */
    static forChild(routes: Routes): ModuleWithProviders<RouterModule> {
        return {
            module: RouterModule,
            providers: [
                { provide: ROUTES, multi: true, useValue: routes }
            ]
        }
    }
}


/*
 * microservice router module.
 */
@Module({
    providers: [
        { provide: RouteMatcher, useClass: DefaultRouteMatcher, asDefault: true },
        { provide: MircoServiceRouter, useClass: MircoServiceRouterImpl },
    ]
})
export class MicroServiceRouterModule {

    /**
     * Creates a module with all the router directives and a provider registering routes,
     * without creating a new Router service.
     * When registering for submodules and lazy-loaded submodules, create the Module as follows:
     *
     * @usageNotes
     * 
     * #### Examples:
     * 
     * module examples.
     * 
     * ```ts
     * 
     * @Module({
     *   imports: [RouterModule.forChild(ROUTES)]
     * })
     * class MyNgModule {}
     * 
     * ```
     *
     * @param options An array of `Route` objects that define the navigation paths for the submodule.
     * @return The new Module.
     *
     */
    static forRoot(protocol: Protocol, options?: {
        matcher?: RouteMatcher;
        prefix?: string;
        routes?: Routes;
    }): ModuleWithProviders<MicroServiceRouterModule>
    static forRoot(options: {
        protocol: Protocol;
        matcher?: RouteMatcher;
        prefix?: string;
        routes?: Routes;
    }): ModuleWithProviders<MicroServiceRouterModule>
    static forRoot(arg1?: any, options?: {
        matcher?: RouteMatcher;
        prefix?: string;
        routes?: Routes;
    }): ModuleWithProviders<MicroServiceRouterModule> {
        const protocol = isString(arg1) ? arg1 : arg1.protocol;
        const opts = { ...isString(arg1) ? options : arg1 };
        const token = getMessageRouter(protocol);
        return {
            module: MicroServiceRouterModule,
            providers: [
                {
                    provide: token,
                    useFactory: (injector: Injector, matcher: RouteMatcher) => {
                        return new MessageRouterImpl(protocol, injector, opts.matcher ?? matcher, opts.prefix, opts.routes)
                    },
                    deps: [
                        Injector,
                        RouteMatcher
                    ]
                },
                {
                    provide: MESSAGE_ROUTERS,
                    useExisting: token,
                    multi: true
                }
            ]
        }
    }

    static getToken(protocol: Protocol): Token<MessageRouter> {
        return getMessageRouter(protocol)
    }
}

export function getMessageRouter(protocol: Protocol): Token<MessageRouter> {
    return getToken(MessageRouter, protocol)
}


