import { Module } from '../metadata/decor';
import { MappingRouterResolver, Router, RouterResolver } from './middlewares/router';
import {
    SlicePipe, SortPipe, LowerCasePipe, UpperCasePipe, JsonPipe, DateFormatPipe, ParseStringPipe,
    ParseBoolPipe, ParseEnumPipe, ParseFloatPipe, ParseIntPipe, ParseNumberPipe, DatePipe
} from '../pipes'

import { MiddlewareRefFactoryResolver } from './middlewares/middleware';
import { RouteRefFactoryResolver } from './middlewares/route';
import { DefaultRouteRefFactoryResovler } from './middlewares/route_ref';
import { DefaultMiddlewareRefFactoryResolver } from './middlewares/middleware_ref';

/*
 * trasport module.
 */
@Module({
    providedIn: 'root',
    providers: [
        { provide: RouterResolver, useValue: new MappingRouterResolver() },
        { provide: RouteRefFactoryResolver, useValue: new DefaultRouteRefFactoryResovler() },
        { provide: MiddlewareRefFactoryResolver, useValue: new DefaultMiddlewareRefFactoryResolver() },
        LowerCasePipe, UpperCasePipe, SlicePipe, SortPipe, JsonPipe, DatePipe, DateFormatPipe,
        ParseStringPipe, ParseBoolPipe, ParseEnumPipe, ParseFloatPipe, ParseIntPipe, ParseNumberPipe
    ]
})
export class TrasportModule {

}
