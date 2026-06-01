import { Module } from '@tsdi/ioc';
import { BodyParserInterceptor as AbstractBodyParserInterceptor, ContentInterceptor as AbstractContentInterceptor, CookieInterceptor as AbstractCookieInterceptor, JsonInterceptor as AbstractJsonInterceptor, SessionInterceptor as AbstractSessionInterceptor } from '@tsdi/service';
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
import { HttpCookieInterceptor } from './server/interceptors/cookie';
import { HttpBodyParserInterceptor } from './server/interceptors/bodyparser';
import { HttpContentInterceptor } from './server/interceptors/content';
import { HttpJsonInterceptor } from './server/interceptors/json';

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
        { provide: AbstractCookieInterceptor, useClass: HttpCookieInterceptor },
    ],
    declarations: [
        HttpClient,
        HttpServer,
        Cors,
        HelmetMiddleware,
        Csrf,
        HttpLoggerInterceptor,
        HttpSessionInterceptor,
        HttpCookieInterceptor,
        HttpBodyParserInterceptor,
        HttpContentInterceptor,
        HttpJsonInterceptor,
    ]
})
export class HttpModule {

}
