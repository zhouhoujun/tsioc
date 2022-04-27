import { Module, RouterMiddleware, RouterModule, TransformModule, TransportContextFactory } from '@tsdi/core';
import { LogMiddleware } from '../middlewares/log';
import { Http } from './clinet';
import { HttpContextFactory, HTTP_MIDDLEWARES } from './context';
import { HttpServer } from './server';

@Module({
    imports: [
        TransformModule,
        RouterModule
    ],
    providers: [
        { provide: TransportContextFactory, useClass: HttpContextFactory },
        { provide: HTTP_MIDDLEWARES, useClass: LogMiddleware, multi: true },
        { provide: HTTP_MIDDLEWARES, useClass: RouterMiddleware, multi: true },
        HttpServer,
        Http
    ]
})
export class HttpModule {

}


