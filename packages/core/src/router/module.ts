import { ModuleWithProviders } from '@tsdi/ioc';
import { Module } from '../metadata/decor';
import { RouteFactoryResolver, ROUTES, Routes } from './route';
import { DefaultRouteFactoryResovler } from './route_ref';
import { MappingRouterResolver, RouterResolver } from './router';
import { ExecptionModule } from '../execptions';
import { LogModule } from '@tsdi/logs';


/*
 * Middleware module.
 */
@Module({
    imports:[
        LogModule,
        ExecptionModule
    ],
    providers: [
        { provide: RouterResolver, useValue: new MappingRouterResolver() },
        { provide: RouteFactoryResolver, useValue: new DefaultRouteFactoryResovler() },
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
            ],
        };
    }
}
