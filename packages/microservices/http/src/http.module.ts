import { Module } from '@tsdi/ioc';
import { BodyParserInterceptor as AbstractBodyParserInterceptor, ContentInterceptor as AbstractContentInterceptor, JsonInterceptor as AbstractJsonInterceptor, SessionInterceptor as AbstractSessionInterceptor } from '@tsdi/service';
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
import { HttpBodyParserInterceptor } from './server/interceptors/bodyparser';
import { HttpContentInterceptor } from './server/interceptors/content';
import { HttpJsonInterceptor } from './server/interceptors/json';
import { StaticFileInterceptor } from './server/static-file.interceptor';

@Module({
    providers: [
        HttpResponseEventFactory,
        HttpBodySerializeStrategy,
        HttpTransportStrategy,
        HttpTimeoutStrategy,
        CsrfTokensFactory,
        { provide: AbstractContentInterceptor, useClass: HttpContentInterceptor },
        { provide: AbstractJsonInterceptor, useClass: HttpJsonInterceptor },
        { provide: AbstractBodyParserInterceptor, useClass: HttpBodyParserInterceptor },
        { provide: AbstractSessionInterceptor, useClass: HttpSessionInterceptor },
    ],
    declarations: [
        HttpClient,
        HttpServer,
        Cors,
        HelmetMiddleware,
        Csrf,
        HttpLoggerInterceptor,
        HttpSessionInterceptor,
        HttpBodyParserInterceptor,
        HttpContentInterceptor,
        HttpJsonInterceptor,
        StaticFileInterceptor,
    ]
})
export class HttpModule {

}
