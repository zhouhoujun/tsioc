import { Module } from '@tsdi/ioc';
import { Http } from './client/clinet';
import { HTTP_CLIENT_INTERCEPTORS } from './client/options';
import { HttpPathInterceptor } from './client/path';
import { HttpServer } from './server/server';
import { HttpContextFactory } from './server/context';
import { HttpStatusAdapter } from './status';
import { HttpResponseEventFactory } from './client/response.factory';
import { HttpClientCodingsHandlers } from './client/codings.hanlders';
import { HttpCodingsHandlers } from './server/codings.handlers';
import { HttpConfiguration } from './configuration';


@Module({
    providers: [
        Http,
        HttpServer,
        HttpStatusAdapter,
        HttpResponseEventFactory,
        HttpClientCodingsHandlers,
        HttpCodingsHandlers,
        // HttpTransportBackend,
        HttpPathInterceptor,
        // HttpClientSessionFactory,
        // HttpServerSessionFactory,
        HttpContextFactory,
        { provide: HTTP_CLIENT_INTERCEPTORS, useExisting: HttpPathInterceptor, multi: true },
        HttpConfiguration
    ]
})
export class HttpModule {

}
