import { Module } from '../metadata/decor';
import { MiddlewareRefFactoryResolver } from './middleware.ref';
import { RouteRefFactoryResolver } from './route';
import { DefaultRouteRefFactoryResovler } from './route_ref';
import { DefaultMiddlewareRefFactoryResolver } from './middleware.factory';
import { MappingRouterResolver, RouterResolver } from './router';

/*
 * Middleware module.
 */
@Module({
    providers: [
        { provide: RouterResolver, useValue: new MappingRouterResolver() },
        { provide: RouteRefFactoryResolver, useValue: new DefaultRouteRefFactoryResovler() },
        { provide: MiddlewareRefFactoryResolver, useValue: new DefaultMiddlewareRefFactoryResolver() },
    ]
})
export class RouterModule {

}
