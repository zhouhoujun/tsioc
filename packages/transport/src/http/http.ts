import { MiddlewareSet, Module, RouterMiddleware, RouterModule, TransformModule, TransportContextFactory } from '@tsdi/core';
import { ModuleWithProviders } from '@tsdi/ioc';
import { LogMiddleware } from '../middlewares/log';
import { Http } from './clinet';
import { HttpContextFactory, HTTP_MIDDLEWARES } from './context';
import { HttpServer, HttpMiddlewareSet, HttpServerOptions, HTTP_SERVEROPTIONS } from './server';

@Module({
    imports: [
        TransformModule,
        RouterModule
    ],
    providers: [
        { provide: TransportContextFactory, useClass: HttpContextFactory },
        { provide: MiddlewareSet, useClass: HttpMiddlewareSet },
        HttpServer,
        Http,
        { provide: HTTP_MIDDLEWARES, useClass: LogMiddleware, multi: true },
        { provide: HTTP_MIDDLEWARES, useClass: RouterMiddleware, multi: true },
        { provide: HTTP_MIDDLEWARES, useClass: RouterMiddleware, multi: true },
    ]
})
export class HttpModule {

    static withOption(option: HttpServerOptions): ModuleWithProviders<HttpModule> {
        return {
            module: HttpModule,
            providers: [
                { provide: HTTP_SERVEROPTIONS, useValue: option }
            ]
        }
    }
}


