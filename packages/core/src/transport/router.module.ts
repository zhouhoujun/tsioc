import { Module, ModuleWithProviders } from '@tsdi/ioc';
import { RouteEndpointFactoryResolverImpl } from '../impl/route.endpoint';
import { ROUTES, Routes } from './route';
import { RouteEndpointFactoryResolver } from './route.endpoint';
import { MappingRouter, Router } from './router';

/*
 * Middleware module.
 */
@Module({
    providers: [
        { provide: RouteEndpointFactoryResolver, useValue: new RouteEndpointFactoryResolverImpl() },
        { provide: Router, useClass: MappingRouter, static: true }
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
