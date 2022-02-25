import { Module } from '../../metadata/decor';
import { MiddlewareRefFactoryResolver } from './middlewares';
import { RouteRefFactoryResolver } from './route';
import { DefaultRouteRefFactoryResovler } from './route_ref';
import { DefaultMiddlewareRefFactoryResolver } from './middleware_ref';
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
export class MiddlewareModule {

}
