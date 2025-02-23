import { Injector, InstanceOf, Module, ModuleWithProviders, ProviderType, ReflectiveFactory, Token, TypeOf, UseFactory, getToken, isFunction, isString, isType, tokenId } from '@tsdi/ioc';
import { PatternFormatter, Protocols, defaultFormatter } from '@tsdi/common';
import { ROUTES, Routes } from './route';
import { MESSAGE_ROUTERS, RouteMatcher, Router, ROUTERS } from './router';
import { ControllerRouteFactory } from './controller';
import { MappingRouter, DefaultRouteMatcher } from './router.mapping';
import { RouteHandlerFactoryResolver } from './route.handler';
import { RouteHandlerFactoryResolverImpl } from '../impl/route.handler';



/**
 * global router prefix.
 */
export const ROUTER_PREFIX = tokenId<string>('ROUTER_PREFIX');



@Module({
    providers: [
        { provide: RouteHandlerFactoryResolver, useFactory: (factory) => new RouteHandlerFactoryResolverImpl(factory), deps: [ReflectiveFactory] },
    ]
})
export class RouteEndpointModule {

}

/*
 * Router module.
 */
@Module({
    providers: [
        ControllerRouteFactory
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
     * @param options An array of `Route` objects that define the navigation paths for the submodule.
     * @return The new Module.
     *
     */
    static forRoot(protocol: Protocols, options?: {
        microservice?: boolean;
        matcher?: TypeOf<RouteMatcher>;
        formatter?: TypeOf<PatternFormatter>;
        prefix?: string;
        routes?: Routes;
    }): ModuleWithProviders<RouterModule>
    static forRoot(options: {
        protocol: Protocols;
        microservice?: boolean;
        matcher?: TypeOf<RouteMatcher>;
        formatter?: TypeOf<PatternFormatter>;
        prefix?: string;
        routes?: Routes;
    }): ModuleWithProviders<RouterModule>
    static forRoot(arg1?: any, options?: {
        microservice?: boolean;
        matcher?: TypeOf<RouteMatcher>;
        formatter?: TypeOf<PatternFormatter>;
        prefix?: string;
        routes?: Routes;
    }): ModuleWithProviders<RouterModule> {
        const protocol = isString(arg1) ? arg1 : arg1.protocol;
        const opts = { ...isString(arg1) ? options : arg1 };

        return {
            module: RouterModule,
            providers: createRouteProviders(protocol, opts.microservice, opts)
        }
    }

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
    static forChild(routes: Routes, microservice?: boolean): ModuleWithProviders<RouterModule> {
        return {
            module: RouterModule,
            providers: [
                { provide: microservice ? MESSAGE_ROUTERS : ROUTES, multi: true, useValue: routes }
            ]
        }
    }

    static getToken(protocol: Protocols, microservice?: boolean): Token<Router> {
        return getToken(microservice ? 'MicroServiceRouter' : Router, protocol)
    }
}

export function createRouteProviders(protocol: Protocols, microservice: boolean, optsify: InstanceOf<RouteOpts>, asDefault?: boolean): ProviderType[] {
    const token = getToken(microservice ? 'MicroServiceRouter' : Router, protocol);
    return [
        {
            provide: token,
            useFactory: (injector: Injector) => {
                const opts = isFunction(optsify) ? optsify(injector) : optsify;
                return new MappingRouter(injector,
                    opts.matcher ? (isType(opts.matcher) ? injector.get(opts.matcher) : opts.matcher) : new DefaultRouteMatcher(),
                    opts.formatter ? (isType(opts.formatter) ? injector.get(opts.formatter) : opts.formatter) : injector.get(PatternFormatter, defaultFormatter),
                    protocol,
                    opts.prefix,
                    opts.routes,
                    microservice,
                    asDefault)
            },
            deps: [Injector],
        },
        {
            provide: microservice ? MESSAGE_ROUTERS : ROUTERS,
            useExisting: token,
            multi: true
        }
    ]
}


export interface RouteOpts {
    matcher?: TypeOf<RouteMatcher>;
    formatter?: TypeOf<PatternFormatter>;
    prefix?: string;
    routes?: Routes;
}

