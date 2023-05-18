import { Module, ModuleWithProviders } from '@tsdi/ioc';
import { ROUTES, Routes } from './route';
import { Router } from './router';
import { ASSET_ENDPOINT_IMPL, TRANSPORT_ENDPOINT_IMPL } from './endpoint';
import { MappingRouter, HybridRouter } from './router.mapping';
import { ControllerRouteReolver } from './controller';
import { RouteEndpointFactoryResolver } from './route.endpoint';
import { RouteEndpointFactoryResolverImpl } from '../impl/route.endpoint';
import { TransportContextIml } from '../impl/transport.context';
import { TransportEndpointImpl } from '../impl/transport.endpoint';
import { AssetEndpointImpl } from '../impl/asset.endpoint';
import { TRANSPORT_CONTEXT_IMPL } from './context';


TRANSPORT_ENDPOINT_IMPL.create = (injector, options) => new TransportEndpointImpl(injector, options);

TRANSPORT_CONTEXT_IMPL.create = (injector, options) => new TransportContextIml(injector, options);

ASSET_ENDPOINT_IMPL.create = (injector, options) => new AssetEndpointImpl(injector, options);

/*
 * Middleware module.
 */
@Module({
    providers: [
        MappingRouter,
        { provide: RouteEndpointFactoryResolver, useValue: new RouteEndpointFactoryResolverImpl() },
        { provide: Router, useClass: MappingRouter },
        { provide: HybridRouter, useClass: MappingRouter },
        ControllerRouteReolver
    ]
})
export class RouterModule {

    /**
     * Creates a module with all the router directives and a provider registering routes,
     * without creating a new Router service.
     * When registering for submodules and lazy-loaded submodules, create the Module as follows:
     *
     * ```
     * @Module({
     *   imports: [RouterModule.forChild(ROUTES)]
     * })
     * class MyNgModule {}
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
