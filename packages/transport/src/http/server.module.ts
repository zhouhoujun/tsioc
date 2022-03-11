import { HttpHandler, Module, RouterModule, TransformModule } from '@tsdi/core';
import { Http1Server } from './http1';
import { Http2Server } from './http2';
import { HttpServer } from './server';
import { HttpRouteInterceptingHandler } from './server.handler';

@Module({
    imports: [
        TransformModule,
        RouterModule
    ],
    providers: [
        { provide: HttpHandler, useClass: HttpRouteInterceptingHandler },
        { provide: HttpServer, useClass: Http1Server }
    ]
})
export class HttpModule {

}


@Module({
    imports: [
        TransformModule,
        RouterModule
    ],
    providers: [
        { provide: HttpHandler, useClass: HttpRouteInterceptingHandler },
        { provide: HttpServer, useClass: Http2Server }
    ]
})
export class Http2Module {

}


