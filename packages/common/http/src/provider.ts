import { ArgumentException, Injector, Provider } from '@tsdi/ioc';
import { HttpClient } from './client';
import { FetchBackend } from './fetch';
import { HttpBackend, HttpHandler } from './handler';
import {
    HttpInterceptorFn,
    HttpInterceptingHandler,
    HTTP_FEATURE_INTERCEPTORS,
    HTTP_INCLUDE_LEGACY_INTERCEPTORS,
    NoopInterceptor
} from './interceptor';
import { JsonpCallbackContext, JsonpClientBackend, JsonpInterceptor } from './jsonp';
import { HttpXhrBackend } from './xhr';
import {
    HttpXsrfCookieExtractor,
    HttpXsrfInterceptor,
    HttpXsrfTokenExtractor,
    XSRF_COOKIE_NAME,
    XSRF_HEADER_NAME
} from './xsrf';

export type HttpClientBackendKind = 'fetch' | 'xhr';

/**
 * Legacy options kept only for module-style compatibility helpers.
 *
 * Prefer `provideHttpClient(...features)` for new code.
 */
export interface LegacyHttpClientOptions {
    /**
     * Select the transport backend used by `HttpClient`.
     * Defaults to `xhr` for compatibility with the existing module setup.
     */
    backend?: HttpClientBackendKind;
    /**
     * Configure XSRF protection or disable it entirely.
     */
    xsrf?: false | {
        cookieName?: string;
        headerName?: string;
    };
}

export const enum HttpFeatureKind {
    Backend = 0,
    Xsrf = 1,
    Jsonp = 2,
    Interceptors = 3,
    LegacyInterceptors = 4,
}

export interface HttpFeature<K extends HttpFeatureKind> {
    kind: K;
    providers: Provider[];
    config: HttpFeatureConfig;
}

interface HttpFeatureConfig {
    backend?: HttpClientBackendKind;
    xsrf?: false | {
        cookieName?: string;
        headerName?: string;
    };
    legacyInterceptors?: boolean;
    interceptors?: HttpInterceptorFn[];
}

interface ResolvedHttpClientConfig {
    backend: HttpClientBackendKind;
    xsrf: false | {
        cookieName: string;
        headerName: string;
    };
    legacyInterceptors: boolean;
}

interface HttpFeatureState {
    config: ResolvedHttpClientConfig;
    providers: Provider[];
}

export interface HttpXsrfOptions {
    cookieName?: string;
    headerName?: string;
}

function interceptingHandler(backend: HttpBackend, injector: Injector) {
    return new HttpInterceptingHandler(backend, injector);
}

function createFeature<K extends HttpFeatureKind>(
    kind: K,
    config: HttpFeatureConfig,
    providers: Provider[] = []
): HttpFeature<K> {
    return {
        kind,
        config,
        providers
    };
}

function normalizeProvideHttpClientArgs(
    args: HttpFeature<HttpFeatureKind>[]
): HttpFeature<HttpFeatureKind>[] {
    return [...args].sort((a, b) => a.kind - b.kind);
}

/**
 * Converts legacy module options into feature providers.
 *
 * Prefer composing features directly in new code.
 */
export function provideLegacyHttpClientFeatures(options: LegacyHttpClientOptions = {}): HttpFeature<HttpFeatureKind>[] {
    const features: HttpFeature<HttpFeatureKind>[] = [];
    if (options.backend === 'fetch') {
        features.push(withFetch());
    } else if (options.backend === 'xhr') {
        features.push(withXhr());
    }

    if (options.xsrf === false) {
        features.push(withNoXsrfProtection());
    } else if (options.xsrf) {
        features.push(withXsrfConfiguration(options.xsrf));
    }

    return features.sort((a, b) => a.kind - b.kind);
}

function createDefaultFeatureState(): HttpFeatureState {
    return {
        config: {
            backend: 'xhr',
            xsrf: {
                cookieName: 'XSRF-TOKEN',
                headerName: 'X-XSRF-TOKEN'
            },
            legacyInterceptors: false
        },
        providers: []
    };
}

function reduceHttpFeature(state: HttpFeatureState, feature: HttpFeature<HttpFeatureKind>): HttpFeatureState {
    state.providers.push(...feature.providers);

    switch (feature.kind) {
        case HttpFeatureKind.Backend:
            if (feature.config.backend) {
                state.config.backend = feature.config.backend;
            }
            break;
        case HttpFeatureKind.Xsrf:
            if (feature.config.xsrf === false) {
                state.config.xsrf = false;
            } else if (feature.config.xsrf) {
                state.config.xsrf = {
                    cookieName: feature.config.xsrf.cookieName ?? (state.config.xsrf === false ? 'XSRF-TOKEN' : state.config.xsrf.cookieName),
                    headerName: feature.config.xsrf.headerName ?? (state.config.xsrf === false ? 'X-XSRF-TOKEN' : state.config.xsrf.headerName)
                };
            }
            break;
        case HttpFeatureKind.LegacyInterceptors:
            if (feature.config.legacyInterceptors) {
                state.config.legacyInterceptors = true;
            }
            break;
    }

    return state;
}

function resolveHttpFeatureState(features: HttpFeature<HttpFeatureKind>[]): HttpFeatureState {
    return features.reduce(reduceHttpFeature, createDefaultFeatureState());
}

function createXsrfProviders(config: ResolvedHttpClientConfig['xsrf']): Provider[] {
    if (config === false) {
        return [
            { provide: HttpXsrfInterceptor, useClass: NoopInterceptor }
        ];
    }

    return [
        HttpXsrfInterceptor,
        { provide: HTTP_FEATURE_INTERCEPTORS, useExisting: HttpXsrfInterceptor, multi: true },
        { provide: HttpXsrfTokenExtractor, useClass: HttpXsrfCookieExtractor },
        { provide: XSRF_COOKIE_NAME, useValue: config.cookieName },
        { provide: XSRF_HEADER_NAME, useValue: config.headerName },
    ];
}

function createBackendProviders(backend: HttpClientBackendKind): Provider[] {
    if (backend === 'fetch') {
        return [
            FetchBackend,
            { provide: HttpBackend, useExisting: FetchBackend }
        ];
    }

    if (backend === 'xhr') {
        return [
            HttpXhrBackend,
            { provide: HttpBackend, useExisting: HttpXhrBackend }
        ];
    }

    throw new ArgumentException(`Unsupported http client backend: ${backend}`);
}

function jsonpCallbackContext(): Object {
    if (typeof window === 'object') {
        return window;
    }
    return {};
}

function provideHttpClientXsrf(options: HttpXsrfOptions = {}): Provider[] {
    return createXsrfProviders({
        cookieName: options.cookieName ?? 'XSRF-TOKEN',
        headerName: options.headerName ?? 'X-XSRF-TOKEN'
    });
}

function provideHttpClientNoXsrfProtection(): Provider[] {
    return createXsrfProviders(false);
}

function provideHttpClientJsonp(): Provider[] {
    return [
        JsonpClientBackend,
        { provide: JsonpCallbackContext, useFactory: jsonpCallbackContext },
        { provide: HTTP_FEATURE_INTERCEPTORS, useClass: JsonpInterceptor, multi: true },
    ];
}

/**
 * Configures `HttpClient` to use the Fetch API backend.
 *
 * Typical usage:
 *
 * ```ts
 * providers: [
 *   ...provideHttpClient(withFetch())
 * ]
 * ```
 */
export function withFetch(): HttpFeature<HttpFeatureKind.Backend> {
    return createFeature(HttpFeatureKind.Backend, { backend: 'fetch' });
}

/**
 * Configures `HttpClient` to use the `XMLHttpRequest` backend.
 *
 * `XMLHttpRequest` remains the default when no backend feature is provided.
 */
export function withXhr(): HttpFeature<HttpFeatureKind.Backend> {
    return createFeature(HttpFeatureKind.Backend, { backend: 'xhr' });
}

/**
 * Disables XSRF protection for outgoing requests.
 */
export function withNoXsrfProtection(): HttpFeature<HttpFeatureKind.Xsrf> {
    return createFeature(HttpFeatureKind.Xsrf, { xsrf: false });
}

/**
 * Configures XSRF protection for outgoing requests.
 */
export function withXsrfConfiguration(options: {
    cookieName?: string;
    headerName?: string;
} = {}): HttpFeature<HttpFeatureKind.Xsrf> {
    return createFeature(HttpFeatureKind.Xsrf, {
        xsrf: {
            cookieName: options.cookieName,
            headerName: options.headerName
        }
    });
}

/**
 * Enables JSONP support for `HttpClient.jsonp()`.
 */
export function withJsonpSupport(): HttpFeature<HttpFeatureKind.Jsonp> {
    return createFeature(HttpFeatureKind.Jsonp, {}, provideHttpClientJsonp());
}

/**
 * Includes functional or instance-based interceptors in the configured `HttpClient`.
 */
export function withInterceptors(interceptors: HttpInterceptorFn[]): HttpFeature<HttpFeatureKind.Interceptors> {
    return createFeature(HttpFeatureKind.Interceptors, { interceptors }, interceptors.map(interceptor => ({
        provide: HTTP_FEATURE_INTERCEPTORS,
        useValue: interceptor,
        multi: true
    })));
}

/**
 * Includes class-based interceptors configured using the legacy
 * `HTTP_COMMON_INTERCEPTORS` multi-provider in the current injector.
 */
export function withInterceptorsFromDi(): HttpFeature<HttpFeatureKind.LegacyInterceptors> {
    return createFeature(HttpFeatureKind.LegacyInterceptors, { legacyInterceptors: true }, [
        { provide: HTTP_INCLUDE_LEGACY_INTERCEPTORS, useValue: true }
    ]);
}

/**
 * Provides `HttpClient` using plain providers instead of `HttpClientModule`.
 *
 * Typical usage:
 *
 * ```ts
 * providers: [
 *   ...provideHttpClient(withFetch())
 * ]
 * ```
 *
 * For environments that rely on `XMLHttpRequest`, either omit backend features
 * or use `withXhr()` explicitly.
 */
export function provideHttpClient(...features: HttpFeature<HttpFeatureKind>[]): Provider[] {
    const normalizedFeatures = normalizeProvideHttpClientArgs(features);
    const state = resolveHttpFeatureState(normalizedFeatures);

    return [
        HttpClient,
        { provide: HTTP_INCLUDE_LEGACY_INTERCEPTORS, useValue: state.config.legacyInterceptors },
        { provide: HttpHandler, useFactory: interceptingHandler, deps: [HttpBackend, Injector] },
        ...state.providers,
        ...createXsrfProviders(state.config.xsrf),
        ...createBackendProviders(state.config.backend)
    ];
}
