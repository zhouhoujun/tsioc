import { Module, ModuleWithProviders, Provider } from '@tsdi/ioc';
import { HTTP_COMMON_INTERCEPTORS, NoopInterceptor } from './interceptor';
import { JsonpCallbackContext, JsonpClientBackend, JsonpInterceptor } from './jsonp';
import {
    provideHttpClient,
    provideLegacyHttpClientFeatures,
    HttpXsrfOptions,
    LegacyHttpClientOptions,
    withInterceptorsFromDi,
    withXsrfConfiguration
} from './provider';
import { HttpXsrfCookieExtractor, HttpXsrfInterceptor, HttpXsrfTokenExtractor, XSRF_COOKIE_NAME, XSRF_HEADER_NAME } from './xsrf';

function provideLegacyHttpClientXsrf(options: HttpXsrfOptions = {}): Provider[] {
    return [
        HttpXsrfInterceptor,
        { provide: HTTP_COMMON_INTERCEPTORS, useExisting: HttpXsrfInterceptor, multi: true },
        { provide: HttpXsrfTokenExtractor, useClass: HttpXsrfCookieExtractor },
        { provide: XSRF_COOKIE_NAME, useValue: options.cookieName ?? 'XSRF-TOKEN' },
        { provide: XSRF_HEADER_NAME, useValue: options.headerName ?? 'X-XSRF-TOKEN' },
    ];
}

function provideLegacyHttpClientNoXsrfProtection(): Provider[] {
    return [
        { provide: HttpXsrfInterceptor, useClass: NoopInterceptor }
    ];
}

function provideLegacyJsonpCallbackContext(): Object {
    if (typeof window === 'object') {
        return window;
    }
    return {};
}

function provideLegacyHttpClientJsonp(): Provider[] {
    return [
        JsonpClientBackend,
        { provide: JsonpCallbackContext, useFactory: provideLegacyJsonpCallbackContext },
        { provide: HTTP_COMMON_INTERCEPTORS, useClass: JsonpInterceptor, multi: true },
    ];
}



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
        ...provideLegacyHttpClientXsrf()
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
                ...provideLegacyHttpClientNoXsrfProtection(),
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
                ...provideLegacyHttpClientXsrf(options)
            ]
        };
    }
}

/**
 * http client module, Configures the module injector for {@link HttpClient}.
 * 
 * You can add interceptors to the chain behind `HttpClient` by binding them to the
 * multiprovider for built-in {@link HTTP_COMMON_INTERCEPTORS}.
 */
@Module({
    providers: [
        ...provideHttpClient(
            withInterceptorsFromDi(),
            withXsrfConfiguration({
                cookieName: 'XSRF-TOKEN',
                headerName: 'X-XSRF-TOKEN',
            })
        )
    ]
})
export class HttpClientModule {
    /**
     * Configure `HttpClientModule` with an explicit backend and optional XSRF settings.
     *
     * Typical usage:
     *
     * ```ts
     * imports: [
     *   HttpClientModule.withOptions({ backend: 'fetch', xsrf: false })
     * ]
     * ```
     */
    static withOptions(options: LegacyHttpClientOptions = {}): ModuleWithProviders<HttpClientModule> {
        const features = [
            ...provideLegacyHttpClientFeatures(options),
            withInterceptorsFromDi()
        ];

        return {
            module: HttpClientModule,
            providers: [
                ...provideHttpClient(...features)
            ]
        };
    }
}

/**
 * Configures the module injector for {@link HttpClient}
 * with supporting services for JSONP.
 * Without this module, Jsonp requests reach the backend
 * with method JSONP, where they are rejected.
 *
 * You can add interceptors to the chain behind `HttpClient` by binding them to the
 * multiprovider for built-in {@link HTTP_COMMON_INTERCEPTORS}.
 *
 * @publicApi
 */
@Module({
    providers: [
        ...provideLegacyHttpClientJsonp(),
    ],
})
export class HttpClientJsonpModule {
}
