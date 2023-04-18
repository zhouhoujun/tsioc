import { Module, ModuleWithProviders } from '@tsdi/ioc';
import { ROUTES, Routes } from './route';
import { Router } from './router';
import { MappingRouter } from './middleware.router';
import { ControllerRouteReolver } from './controller';
import { RouteEndpointFactoryResolver } from './route.endpoint';
import { RouteEndpointFactoryResolverImpl } from '../impl/route.endpoint';
import { TRANSPORT_ENDPOINT_IMPL } from './endpoint';
import { TransportEndpointImpl } from '../impl/transport.endpoint';


TRANSPORT_ENDPOINT_IMPL.create = (injector, options)=> new TransportEndpointImpl(injector, options);

/*
 * Middleware module.
 */
@Module({
    providers: [
        { provide: RouteEndpointFactoryResolver, useValue: new RouteEndpointFactoryResolverImpl() },
        { provide: Router, useClass: MappingRouter, static: true },
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
