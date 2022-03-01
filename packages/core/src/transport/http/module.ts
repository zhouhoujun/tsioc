import { Module } from '../../metadata/decor';
import { HttpInterceptingHandler, HTTP_INTERCEPTORS, NoopInterceptor } from './interceptor';
import { TransformModule } from '../../pipes/module';
import { RouterModule } from '../../router';
import { HttpClient } from './client';
import { HttpBackend, HttpHandler } from './handler';
import { HttpServer } from './server';
import { JsonpCallbackContext, JsonpClientBackend, JsonpInterceptor } from './jsonp';
import { HttpXhrBackend } from './backend';
import { ModuleWithProviders } from '@tsdi/ioc';
import { HttpXsrfCookieExtractor, HttpXsrfInterceptor, HttpXsrfTokenExtractor, XSRF_COOKIE_NAME, XSRF_HEADER_NAME } from './xsrf';



/**
 * Configures XSRF protection support for outgoing requests.
 *
 * For a server that supports a cookie-based XSRF protection system,
 * use directly to configure XSRF protection with the correct
 * cookie and header names.
 *
 * If no names are supplied, the default cookie name is `XSRF-TOKEN`
 * and the default header name is `X-XSRF-TOKEN`.
 *
 * @publicApi
 */
@Module({
    providers: [
        HttpXsrfInterceptor,
        { provide: HTTP_INTERCEPTORS, useExisting: HttpXsrfInterceptor, multi: true },
        { provide: HttpXsrfTokenExtractor, useClass: HttpXsrfCookieExtractor },
        { provide: XSRF_COOKIE_NAME, useValue: 'XSRF-TOKEN' },
        { provide: XSRF_HEADER_NAME, useValue: 'X-XSRF-TOKEN' },
    ],
})
export class HttpClientXsrfModule {
    /**
     * Disable the default XSRF protection.
     */
    static disable(): ModuleWithProviders<HttpClientXsrfModule> {
        return {
            module: HttpClientXsrfModule,
            providers: [
                { provide: HttpXsrfInterceptor, useClass: NoopInterceptor },
            ],
        };
    }

    /**
     * Configure XSRF protection.
     * @param options An object that can specify either or both
     * cookie name or header name.
     * - Cookie name default is `XSRF-TOKEN`.
     * - Header name default is `X-XSRF-TOKEN`.
     *
     */
    static withOptions(options: {
        cookieName?: string,
        headerName?: string,
    } = {}): ModuleWithProviders<HttpClientXsrfModule> {
        return {
            module: HttpClientXsrfModule,
            providers: [
                options.cookieName ? { provide: XSRF_COOKIE_NAME, useValue: options.cookieName } : [],
                options.headerName ? { provide: XSRF_HEADER_NAME, useValue: options.headerName } : [],
            ],
        };
    }
}

@Module({
    /**
    * Optional configuration for XSRF protection.
    */
    imports: [
        HttpClientXsrfModule.withOptions({
            cookieName: 'XSRF-TOKEN',
            headerName: 'X-XSRF-TOKEN',
        }),
    ],
    providers: [
        HttpClient,
        { provide: HttpHandler, useClass: HttpInterceptingHandler },
        HttpXhrBackend,
        { provide: HttpBackend, useExisting: HttpXhrBackend }
    ]
})
export class HttpClientModule {

}

/**
 * Configures the [dependency injector](guide/glossary#injector) for `HttpClient`
 * with supporting services for JSONP.
 * Without this module, Jsonp requests reach the backend
 * with method JSONP, where they are rejected.
 *
 * You can add interceptors to the chain behind `HttpClient` by binding them to the
 * multiprovider for built-in [DI token](guide/glossary#di-token) `HTTP_INTERCEPTORS`.
 *
 * @publicApi
 */
@Module({
    providers: [
        JsonpClientBackend,
        { provide: JsonpCallbackContext, useFactory: jsonpCallbackContext },
        { provide: HTTP_INTERCEPTORS, useClass: JsonpInterceptor, multi: true },
    ],
})
export class HttpClientJsonpModule {
}

export function jsonpCallbackContext(): Object {
    if (typeof window === 'object') {
        return window;
    }
    return {};
}


@Module({
    imports: [
        TransformModule,
        RouterModule
    ],
    providers: [
        HttpServer
    ]
})
export class HttpServerModule {

}
