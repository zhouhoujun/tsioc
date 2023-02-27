import { Module, ModuleWithProviders, _tyobj } from '@tsdi/ioc';
import { HttpBackend, HttpHandler } from './handler';
import { HttpClient } from './client';
import { HttpXhrBackend } from './xhr';
import { HttpInterceptingHandler, HTTP_CLIENT_INTERCEPTORS, NoopInterceptor } from './interceptor';
import { JsonpCallbackContext, JsonpClientBackend, JsonpInterceptor } from './jsonp';
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
        { provide: HTTP_CLIENT_INTERCEPTORS, useExisting: HttpXsrfInterceptor, multi: true },
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
            ]
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
            ]
        };
    }
}

/**
 * http client module, Configures the module injector for {@link HttpClient}.
 * 
 * You can add interceptors to the chain behind `HttpClient` by binding them to the
 * multiprovider for built-in {@link HTTP_INTERCEPTORS}.
 */
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
 * Configures the module injector for {@link HttpClient}
 * with supporting services for JSONP.
 * Without this module, Jsonp requests reach the backend
 * with method JSONP, where they are rejected.
 *
 * You can add interceptors to the chain behind `HttpClient` by binding them to the
 * multiprovider for built-in {@link HTTP_INTERCEPTORS}.
 *
 * @publicApi
 */
@Module({
    providers: [
        JsonpClientBackend,
        { provide: JsonpCallbackContext, useFactory: jsonpCallbackContext },
        { provide: HTTP_CLIENT_INTERCEPTORS, useClass: JsonpInterceptor, multi: true },
    ],
})
export class HttpClientJsonpModule {
}

export function jsonpCallbackContext(): Object {
    if (typeof window === _tyobj) {
        return window
    }
    return {}
}
