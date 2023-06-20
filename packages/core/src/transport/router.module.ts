import { InjectFlags, Injector, Module, ModuleWithProviders, Token, TypeOf, getToken, isString, isType, tokenId } from '@tsdi/ioc';
import { ROUTES, Routes } from './route';
import { RouteMatcher, Router } from './router';
import { Protocol } from './protocols';
import { TRANSPORT_CONTEXT_IMPL } from './context';
import { PatternFormatter, patternToPath } from './pattern';
import { MIDDLEEARE_ENDPOINT_IMPL, TRANSPORT_ENDPOINT_IMPL } from './endpoint';
import { HybridRouter } from './router.hybrid';
import { ControllerRouteReolver } from './controller';
import { MappingRouter, DefaultRouteMatcher } from './router.mapping';
import { MESSAGE_ROUTERS, MircoServRouter, MircoServRouters } from './router.micro';
import { RouteEndpointFactoryResolver } from './route.endpoint';
import { RouteEndpointFactoryResolverImpl } from '../impl/route.endpoint';
import { TransportContextIml } from '../impl/transport.context';
import { TransportEndpointImpl } from '../impl/transport.endpoint';
import { MiddlewareEndpointImpl } from '../impl/middleware.endpoint';
import { MessageRouterImpl, MircoServiceRouterImpl } from '../impl/micro.router';



TRANSPORT_ENDPOINT_IMPL.create = (injector, options) => new TransportEndpointImpl(injector, options);

TRANSPORT_CONTEXT_IMPL.create = (injector, options) => new TransportContextIml(injector, options);

MIDDLEEARE_ENDPOINT_IMPL.create = (injector, options) => new MiddlewareEndpointImpl(injector, options);


/**
 * global router prefix.
 */
export const ROUTER_PREFIX = tokenId<string>('ROUTER_PREFIX');

const defaultFormatter: PatternFormatter = {
    format: (pattern) => patternToPath(pattern)
}

/*
 * Router module.
 */
@Module({
    providers: [
        { provide: RouteMatcher, useClass: DefaultRouteMatcher, asDefault: true },
        { provide: RouteEndpointFactoryResolver, useValue: new RouteEndpointFactoryResolverImpl() },
        {
            provide: HybridRouter,
            useFactory: (injector: Injector, matcher: RouteMatcher, formatter: PatternFormatter, prefix?: string, routes?: Routes) => {
                return new MappingRouter(injector, matcher, formatter, prefix, routes)
            },
            deps: [
                Injector,
                RouteMatcher,
                PatternFormatter,
                [ROUTER_PREFIX, InjectFlags.Optional],
                [ROUTES, InjectFlags.Optional, InjectFlags.Self]
            ]
        },
        { provide: PatternFormatter, useValue: defaultFormatter },
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
        { provide: PatternFormatter, useValue: defaultFormatter, asDefault: true },
        { provide: MircoServRouters, useClass: MircoServiceRouterImpl },
    ]
})
export class MicroServRouterModule {

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
        matcher?: TypeOf<RouteMatcher>;
        formatter?: TypeOf<PatternFormatter>;
        prefix?: string;
        routes?: Routes;
    }): ModuleWithProviders<MicroServRouterModule>
    static forRoot(options: {
        protocol: Protocol;
        matcher?: TypeOf<RouteMatcher>;
        formatter?: TypeOf<PatternFormatter>;
        prefix?: string;
        routes?: Routes;
    }): ModuleWithProviders<MicroServRouterModule>
    static forRoot(arg1?: any, options?: {
        matcher?: TypeOf<RouteMatcher>;
        formatter?: TypeOf<PatternFormatter>;
        prefix?: string;
        routes?: Routes;
    }): ModuleWithProviders<MicroServRouterModule> {
        const protocol = isString(arg1) ? arg1 : arg1.protocol;
        const opts = { ...isString(arg1) ? options : arg1 };
        const token = getMircServRouter(protocol);
        const deps: any[] = [Injector];

        if (isType(opts.matcher)) {
            deps.push(opts.matcher);
            opts.matcher = null;
        } else if (!opts.matcher) {
            deps.push(RouteMatcher)
        }

        if (isType(opts.formatter)) {
            deps.push(opts.formatter);
            opts.formatter = null;
        } else if (!opts.formatter) {
            deps.push(PatternFormatter)
        }

        return {
            module: MicroServRouterModule,
            providers: [
                {
                    provide: token,
                    useFactory: (injector: Injector, matcher: RouteMatcher, formatter: PatternFormatter) => {
                        return new MessageRouterImpl(protocol, injector, opts.matcher ?? matcher, opts.formatter ?? formatter, opts.prefix, opts.routes)
                    },
                    deps
                },
                {
                    provide: MESSAGE_ROUTERS,
                    useExisting: token,
                    multi: true
                }
            ]
        }
    }

    static getToken(protocol: Protocol): Token<MircoServRouter> {
        return getMircServRouter(protocol)
    }
}

export function getMircServRouter(protocol: Protocol): Token<MircoServRouter> {
    return getToken(MircoServRouter, protocol)
}


