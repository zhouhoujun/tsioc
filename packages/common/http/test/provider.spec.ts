import expect = require('expect');
import { createInjector, Injectable } from '@tsdi/ioc';
import { DOCUMENT, PLATFORM_BROWSER_ID, PLATFORM_ID } from '@tsdi/common';
import { HttpClient } from '../src/client';
import {
    provideHttpClient,
    withFetch,
    withInterceptors,
    withInterceptorsFromDi,
    withJsonpSupport,
    withNoXsrfProtection,
    withXsrfConfiguration
} from '../src/provider';
import { XhrFactory } from '../src/handler';
import { HttpClientJsonpModule, HttpClientModule, HttpClientXsrfModule } from '../src/module';
import { lastValueFrom } from 'rxjs';
import { HTTP_COMMON_INTERCEPTORS, HttpInterceptor } from '../src/interceptor';
import { HttpXsrfTokenExtractor, XSRF_COOKIE_NAME, XSRF_HEADER_NAME } from '../src/xsrf';
import { HttpHandler } from '../src/handler';
import { HttpRequest } from '../src/request';
import { HttpEvent } from '../src/response';
import { Observable } from 'rxjs';

@Injectable()
class FakeXhr {
    responseType = '';
    responseText = '';
    response: any = null;
    status = 200;
    statusText = 'OK';
    withCredentials = false;
    readyState = 4;
    headers: Record<string, string> = {};
    upload = { addEventListener() { return; }, removeEventListener() { return; } };
    private listeners = new Map<string, Function[]>();

    open(_method: string, _url: string) { return; }
    setRequestHeader(name: string, value: string) { this.headers[name] = value; }
    getAllResponseHeaders() { return 'content-type: application/json'; }
    getResponseHeader(name: string) { return this.headers[name] ?? (name.toLowerCase() === 'content-type' ? 'application/json' : null); }
    addEventListener(name: string, handler: Function) {
        const arr = this.listeners.get(name) ?? [];
        arr.push(handler);
        this.listeners.set(name, arr);
    }
    removeEventListener(name: string, handler: Function) {
        const arr = this.listeners.get(name) ?? [];
        this.listeners.set(name, arr.filter(fn => fn !== handler));
    }
    send(_body?: any) {
        this.responseText = JSON.stringify({ ok: true });
        this.response = this.responseText;
        const handlers = this.listeners.get('load') ?? [];
        handlers.forEach(fn => fn());
    }
    abort() { return; }
}

@Injectable()
class FakeXhrFactory extends XhrFactory {
    build(): XMLHttpRequest {
        return new FakeXhr() as any;
    }
}

@Injectable()
class LegacyHeaderInterceptor implements HttpInterceptor {
    intercept(req: HttpRequest<any>, next: HttpHandler, context: any): Observable<HttpEvent<any>> {
        return next.handle(req.clone({
            headers: req.headers.set('x-legacy-interceptor', 'enabled')
        }), context);
    }
}

class FakeJsonpScript {
    src = '';
    parentNode: { removeChild(node: FakeJsonpScript): void } | null = null;
    private listeners = new Map<string, Function[]>();

    addEventListener(name: string, handler: Function) {
        const arr = this.listeners.get(name) ?? [];
        arr.push(handler);
        this.listeners.set(name, arr);
    }

    removeEventListener(name: string, handler: Function) {
        const arr = this.listeners.get(name) ?? [];
        this.listeners.set(name, arr.filter(fn => fn !== handler));
    }

    dispatch(name: string, event?: any) {
        const handlers = this.listeners.get(name) ?? [];
        handlers.forEach(fn => fn(event));
    }
}

class FakeJsonpDocument {
    createdScripts: FakeJsonpScript[] = [];
    body = {
        appendChild: (node: FakeJsonpScript) => {
            node.parentNode = this.body;
            this.createdScripts.push(node);
            const match = /=(tsioc_jsonp_callback_\d+)(&|$)/.exec(node.src);
            if (match) {
                this.callbackMap[match[1]]?.({ ok: true, transport: 'jsonp' });
            }
            node.dispatch('load', {});
            return node;
        },
        removeChild: (node: FakeJsonpScript) => {
            this.createdScripts = this.createdScripts.filter(item => item !== node);
            node.parentNode = null;
            return node;
        }
    };

    constructor(private callbackMap: Record<string, (data: any) => void>) {}

    createElement(tag: string) {
        expect(tag).toBe('script');
        return new FakeJsonpScript();
    }
}

describe('provideHttpClient', () => {
    it('defaults to xhr backend', async () => {
        const injector = createInjector([
            ...provideHttpClient(withNoXsrfProtection()),
            { provide: XhrFactory, useClass: FakeXhrFactory }
        ] as any);
        const client = injector.get(HttpClient);
        const result = await lastValueFrom(client.get('/test'));
        expect(result).toEqual({ ok: true });
    });

    it('provides HttpClient with fetch backend', async () => {
        const originalFetch = globalThis.fetch;
        globalThis.fetch = (async () => ({
            status: 200,
            statusText: 'OK',
            headers: new Headers({ 'content-type': 'application/json', 'content-length': '11' }),
            body: new ReadableStream({
                start(controller) {
                    controller.enqueue(new TextEncoder().encode('{"ok":true}'));
                    controller.close();
                }
            }),
        })) as any;

        try {
            const injector = createInjector(provideHttpClient(withFetch(), withNoXsrfProtection()) as any);
            const client = injector.get(HttpClient);
            const result = await lastValueFrom(client.get('/test'));
            expect(result).toEqual({ ok: true });
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    it('provides HttpClient with xhr backend', async () => {
        const injector = createInjector([
            ...provideHttpClient(withNoXsrfProtection()),
            { provide: XhrFactory, useClass: FakeXhrFactory }
        ] as any);
        const client = injector.get(HttpClient);
        const result = await lastValueFrom(client.get('/test'));
        expect(result).toEqual({ ok: true });
    });

    it('configures xsrf defaults and overrides with features', () => {
        const defaultInjector = createInjector(provideHttpClient() as any);
        expect(defaultInjector.get(XSRF_COOKIE_NAME)).toBe('XSRF-TOKEN');
        expect(defaultInjector.get(XSRF_HEADER_NAME)).toBe('X-XSRF-TOKEN');

        const configuredInjector = createInjector(provideHttpClient(
            withXsrfConfiguration({
                cookieName: 'CUSTOM-XSRF',
                headerName: 'X-CUSTOM-XSRF'
            })
        ) as any);
        expect(configuredInjector.get(XSRF_COOKIE_NAME)).toBe('CUSTOM-XSRF');
        expect(configuredInjector.get(XSRF_HEADER_NAME)).toBe('X-CUSTOM-XSRF');
    });

    it('disables xsrf protection when requested', () => {
        const injector = createInjector(provideHttpClient(withNoXsrfProtection()) as any);
        expect(() => injector.get(HttpXsrfTokenExtractor)).toThrow();
    });

    it('includes legacy interceptors only when requested', async () => {
        const originalFetch = globalThis.fetch;
        const headers: string[] = [];
        globalThis.fetch = (async (_input: any, init?: RequestInit) => {
            const record = init?.headers as Record<string, string>;
            headers.push(record?.['x-legacy-interceptor'] ?? '');
            return {
                status: 200,
                statusText: 'OK',
                headers: new Headers({ 'content-type': 'application/json', 'content-length': '11' }),
                body: new ReadableStream({
                    start(controller) {
                        controller.enqueue(new TextEncoder().encode('{"ok":true}'));
                        controller.close();
                    }
                }),
            };
        }) as any;

        try {
            const baseProviders = [
                { provide: PLATFORM_ID, useValue: PLATFORM_BROWSER_ID },
                { provide: DOCUMENT, useValue: { cookie: '' } },
                { provide: HTTP_COMMON_INTERCEPTORS, useClass: LegacyHeaderInterceptor, multi: true }
            ];

            const injectorWithoutLegacy = createInjector([
                ...baseProviders,
                ...provideHttpClient(withFetch(), withNoXsrfProtection())
            ] as any);
            await lastValueFrom(injectorWithoutLegacy.get(HttpClient).get('/test'));

            const injectorWithLegacy = createInjector([
                ...baseProviders,
                ...provideHttpClient(withFetch(), withNoXsrfProtection(), withInterceptorsFromDi())
            ] as any);
            await lastValueFrom(injectorWithLegacy.get(HttpClient).get('/test'));

            expect(headers).toEqual(['', 'enabled']);
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    it('includes feature interceptors without relying on legacy DI interceptors', async () => {
        const originalFetch = globalThis.fetch;
        const headers: string[] = [];
        const featureInterceptor = (req: HttpRequest<any>, next: any, context: any) => {
            return next(req.clone({
                headers: req.headers.set('x-feature-interceptor', 'enabled')
            }), context);
        };

        globalThis.fetch = (async (_input: any, init?: RequestInit) => {
            const record = init?.headers as Record<string, string>;
            headers.push(record?.['x-feature-interceptor'] ?? '');
            return {
                status: 200,
                statusText: 'OK',
                headers: new Headers({ 'content-type': 'application/json', 'content-length': '11' }),
                body: new ReadableStream({
                    start(controller) {
                        controller.enqueue(new TextEncoder().encode('{"ok":true}'));
                        controller.close();
                    }
                }),
            };
        }) as any;

        try {
            const injector = createInjector([
                { provide: PLATFORM_ID, useValue: PLATFORM_BROWSER_ID },
                { provide: DOCUMENT, useValue: { cookie: '' } },
                ...provideHttpClient(
                    withFetch(),
                    withNoXsrfProtection(),
                    withInterceptors([featureInterceptor])
                )
            ] as any);

            await lastValueFrom(injector.get(HttpClient).get('/test'));
            expect(headers).toEqual(['enabled']);
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    it('runs feature interceptors before legacy DI interceptors', async () => {
        const originalFetch = globalThis.fetch;
        const traces: string[] = [];
        const featureInterceptor = (req: HttpRequest<any>, next: any, context: any) => {
            traces.push('feature-before');
            return next(req, context);
        };

        @Injectable()
        class TraceLegacyInterceptor implements HttpInterceptor {
            intercept(req: HttpRequest<any>, next: HttpHandler, context: any): Observable<HttpEvent<any>> {
                traces.push('legacy-before');
                return next.handle(req, context);
            }
        }

        globalThis.fetch = (async () => ({
            status: 200,
            statusText: 'OK',
            headers: new Headers({ 'content-type': 'application/json', 'content-length': '11' }),
            body: new ReadableStream({
                start(controller) {
                    controller.enqueue(new TextEncoder().encode('{"ok":true}'));
                    controller.close();
                }
            }),
        })) as any;

        try {
            const injector = createInjector([
                { provide: PLATFORM_ID, useValue: PLATFORM_BROWSER_ID },
                { provide: DOCUMENT, useValue: { cookie: '' } },
                { provide: HTTP_COMMON_INTERCEPTORS, useClass: TraceLegacyInterceptor, multi: true },
                ...provideHttpClient(
                    withFetch(),
                    withNoXsrfProtection(),
                    withInterceptors([featureInterceptor]),
                    withInterceptorsFromDi()
                )
            ] as any);

            await lastValueFrom(injector.get(HttpClient).get('/test'));
            expect(traces).toEqual(['feature-before', 'legacy-before']);
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    it('supports jsonp through feature providers', async () => {
        const callbackMap: Record<string, (data: any) => void> = {};
        const document = new FakeJsonpDocument(callbackMap);
        const injector = createInjector([
            { provide: PLATFORM_ID, useValue: PLATFORM_BROWSER_ID },
            { provide: DOCUMENT, useValue: document },
            ...provideHttpClient(withNoXsrfProtection(), withJsonpSupport())
        ] as any);
        const client = injector.get(HttpClient);
        const result = await lastValueFrom(client.jsonp('/test', 'callback'));
        expect(result).toEqual({ ok: true, transport: 'jsonp' });
        expect(document.createdScripts.length).toBe(0);
    });

    it('creates ModuleWithProviders for HttpClientModule.withOptions', () => {
        const result = HttpClientModule.withOptions({ backend: 'fetch', xsrf: false });
        expect(result.module).toBe(HttpClientModule);
        expect(Array.isArray(result.providers)).toBe(true);
        expect(result.providers!.length).toBeGreaterThan(0);
    });

    it('keeps HttpClientXsrfModule compatible with HttpClientModule imports', () => {
        const xsrfConfig = HttpClientXsrfModule.withOptions({
            cookieName: 'LEGACY-XSRF',
            headerName: 'X-LEGACY-XSRF'
        });
        const injector = createInjector([
            ...provideHttpClient(withInterceptorsFromDi()),
            ...(xsrfConfig.providers ?? [])
        ] as any);

        expect(injector.get(XSRF_COOKIE_NAME)).toBe('LEGACY-XSRF');
        expect(injector.get(XSRF_HEADER_NAME)).toBe('X-LEGACY-XSRF');
    });

    it('keeps HttpClientJsonpModule compatible with HttpClientModule imports', async () => {
        const callbackMap: Record<string, (data: any) => void> = {};
        const document = new FakeJsonpDocument(callbackMap);
        const jsonpModule = { providers: (HttpClientJsonpModule as any).__mod?.providers ?? [] };
        const injector = createInjector([
            { provide: PLATFORM_ID, useValue: PLATFORM_BROWSER_ID },
            { provide: DOCUMENT, useValue: document },
            ...provideHttpClient(withInterceptorsFromDi(), withNoXsrfProtection()),
            ...jsonpModule.providers
        ] as any);

        const result = await lastValueFrom(injector.get(HttpClient).jsonp('/test', 'callback'));
        expect(result).toEqual({ ok: true, transport: 'jsonp' });
    });
});
