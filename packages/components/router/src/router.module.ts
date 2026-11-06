import { Module, ModuleWithProviders } from '@tsdi/ioc';
import { ROUTES, ROUTER_INITIAL_URL, Router, Routes } from './router';
import { RouterOutlet } from './router-outlet';
import { RouterLinkDirective } from './router-link';

@Module({
    providers: [Router, RouterOutlet, RouterLinkDirective],
    declarations: [RouterOutlet, RouterLinkDirective],
    exports: [Router, RouterOutlet, RouterLinkDirective]
})
export class RouterModule {
    static forRoot(routes: Routes = [], initialUrl = '/'): ModuleWithProviders<RouterModule> {
        return {
            module: RouterModule,
            providers: [
                { provide: ROUTES, useValue: routes },
                { provide: ROUTER_INITIAL_URL, useValue: initialUrl }
            ]
        };
    }

    static withRoutes(routes: Routes = [], initialUrl = '/'): ModuleWithProviders<RouterModule> {
        return RouterModule.forRoot(routes, initialUrl);
    }
}
