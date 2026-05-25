import { Module } from '@tsdi/ioc';
import { HttpClient } from './client/client';
import { HttpServer } from './server/http-server';
import { HttpResponseEventFactory } from './client/response.factory';
import { HttpBodySerializeStrategy } from './client/strategies/HttpBodySerializeStrategy';
import { HttpTransportStrategy } from './client/strategies/HttpTransportStrategy';
import { HttpTimeoutStrategy } from './client/strategies/HttpTimeoutStrategy';
import { Cors } from './server/interceptors/cors';
import { HelmetMiddleware } from './server/interceptors/helmet';
import { Csrf, CsrfTokensFactory } from './server/interceptors/csrf';
import { HttpLoggerInterceptor } from './server/interceptors/logger';
import { HttpSessionInterceptor } from './server/interceptors/session';
import { BodyparserInterceptor } from './server/interceptors/bodyparser';
import { ContentInterceptor } from './server/interceptors/content';
import { JsonInterceptor } from './server/interceptors/json';
import { StaticFileInterceptor } from './server/static-file.interceptor';

@Module({
    providers: [
        HttpResponseEventFactory,
        HttpBodySerializeStrategy,
        HttpTransportStrategy,
        HttpTimeoutStrategy,
        CsrfTokensFactory,
    ],
    declarations: [
        HttpClient,
        HttpServer,
        Cors,
        HelmetMiddleware,
        Csrf,
        HttpLoggerInterceptor,
        HttpSessionInterceptor,
        BodyparserInterceptor,
        ContentInterceptor,
        JsonInterceptor,
        StaticFileInterceptor,
    ]
})
export class HttpModule {

}
