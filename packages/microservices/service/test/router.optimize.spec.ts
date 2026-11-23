import expect = require('expect');
import { of } from 'rxjs';
import { createInjector } from '@tsdi/ioc';
import {
    createRequestContext,
    NotFoundException,
    PatternFormatter,
    REQUEST,
    StatusMessageAdapter,
    Transport,
} from '@tsdi/common';
import { OptimizedRouter } from '../src';

class TestStatusAdapter extends StatusMessageAdapter<any, any, number> {
    headers = new Map<string, any>();
    code: any;
    message?: string;
    headersSent = false;

    protected onPayloadChange(payload: any): any {
        return payload;
    }

    protected onErrorChange(error: any): any {
        return error;
    }

    constructor(public request: any = {}, public response: any = {}) {
        super();
    }

    get status(): number {
        return this.code;
    }

    set status(value: number) {
        this.code = value;
    }

    get isHandled(): boolean {
        return this.code != null || this.payload != null || this.error != null;
    }

    get isCommitted(): boolean {
        return this.headersSent;
    }

    get query(): Record<string, any> {
        return this.request?.query ?? {};
    }

    async handle(): Promise<void> {
        return;
    }

    commit(): void {
        this.headersSent = true;
    }

    async destroy(): Promise<void> {
        return;
    }

    read(section: any, name?: string): any {
        switch (section) {
            case 'status':
                return this.status;
            case 'statusMessage':
                return this.message;
            case 'error':
                return this.error;
            case 'body':
            case 'payload': {
                const payload = this.payload;
                return name ? payload?.[name] : payload;
            }
            case 'query':
                return name ? this.request?.query?.[name] : this.request?.query;
            case 'path':
                return name ? this.request?.paths?.[name] : this.request?.paths;
            default:
                return undefined;
        }
    }

    get payload(): any {
        return (this as any)._payload;
    }

    set payload(payload: any) {
        (this as any)._payload = this.onPayloadChange(payload);
    }

    get error(): any {
        return (this as any)._error;
    }

    set error(error: any) {
        (this as any)._error = this.onErrorChange(error);
    }

    setHeader(name: string, value: any): this {
        this.headers.set(name.toLowerCase(), value);
        return this;
    }

    removeHeader(name: string): this {
        this.headers.delete(name.toLowerCase());
        return this;
    }

    setStatus(code: any, message?: string): this {
        this.code = code;
        this.message = message;
        return this;
    }

    getStatusMessage(): any {
        return this.message;
    }

    hasHeader(name: string): boolean {
        return this.headers.has(name.toLowerCase());
    }

    isHeadersSent(): boolean {
        return this.headersSent;
    }

    getHeader(name: string): any {
        return this.headers.get(name.toLowerCase());
    }
}

const formatter: PatternFormatter = {
    format: pattern => String(pattern),
};

function createRouter(microservice = false, transport: Transport | null = Transport.HTTP) {
    return new OptimizedRouter(createInjector(), formatter, '', transport, undefined, undefined, microservice);
}

describe('optimized router', () => {
    it('injects request and payload into context before handling a matched route', done => {
        const router = createRouter();
        const context = createRequestContext(createInjector());
        const request = { url: '/users/42', method: 'GET' } as any;

        router.use('/users/:id', (_input: any, ctx: any) => {
            expect(ctx.get(REQUEST)).toBe(request);
            expect(ctx.getPayload()).toBe(request);
            expect(request.paths).toEqual({ id: '42' });
            return of('matched');
        });

        router.handle(request, context).subscribe({
            next: result => {
                expect(result).toBe('matched');
                done();
            },
            error: done
        });
    });

    it('short-circuits when adapter headers are already sent', done => {
        const router = createRouter();
        const context = createRequestContext(createInjector());
        const adapter = new TestStatusAdapter();
        adapter.headersSent = true;
        context.setMessageAdapter(adapter);
        const request = { url: '/users/42', method: 'GET' } as any;
        let called = false;

        router.use('/users/:id', () => {
            called = true;
            return of('matched');
        });

        router.handle(request, context).subscribe({
            next: result => {
                expect(result).toBe(null);
                expect(called).toBe(false);
                done();
            },
            error: done
        });
    });

    it('continues routing on NotFoundException status but short-circuits non-404 statuses', done => {
        const router = createRouter();
        const context404 = createRequestContext(createInjector());
        const adapter404 = new TestStatusAdapter();
        adapter404.setStatus(404);
        adapter404.setError(new NotFoundException());
        context404.setMessageAdapter(adapter404);
        const request404 = { url: '/alive', method: 'GET' } as any;

        router.use('/alive', () => of('ok'));

        router.handle(request404, context404).subscribe({
            next: result => {
                expect(result).toBe('ok');

                const context500 = createRequestContext(createInjector());
                const adapter500 = new TestStatusAdapter();
                adapter500.setStatus(500);
                adapter500.setError(new Error('boom'));
                context500.setMessageAdapter(adapter500);
                router.handle({ url: '/alive', method: 'GET' } as any, context500).subscribe({
                    next: second => {
                        expect(second).toBe(null);
                        done();
                    },
                    error: done
                });
            },
            error: done
        });
    });

    it('uses fallback when no route can be resolved from request shape', done => {
        const router = createRouter();
        const context = createRequestContext(createInjector());

        router.intercept({ method: 'GET' } as any, { handle: () => of('fallback') } as any, context).subscribe({
            next: result => {
                expect(result).toBe('fallback');
                done();
            },
            error: done
        });
    });

    it('bypasses matching for asset routes', async () => {
        const router = createRouter();
        router.use({ path: '/public', pattern: '/public', assets: true });
        router.use('/public/:file', () => 'asset-handler');

        const route = await router.getRoute({ url: '/public/app.js', method: 'GET' } as any, createRequestContext(createInjector()));
        expect(route).toBeUndefined();
    });

    it('composes multiple microservice handlers for the same route and caches path params per method', done => {
        const router = createRouter(true, Transport.TCP);
        const context = createRequestContext(createInjector());
        const calls: string[] = [];
        const request = { pattern: '/users/42', method: 'GET' } as any;

        router.use({ path: '/users/:id', method: 'GET', handle: (input: any) => {
            calls.push(`first:${input.paths.id}`);
            return of(input);
        } });
        router.use({ path: '/users/:id', method: 'GET', handle: (input: any) => {
            calls.push(`second:${input.paths.id}`);
            return of('done');
        } });

        router.handle(request, context).subscribe({
            next: async result => {
                expect(result).toBe('done');
                expect(calls).toEqual(['first:42', 'second:42']);
                expect(request.paths).toEqual({ id: '42' });

                const secondReq = { pattern: '/users/42', method: 'GET' } as any;
                router.handle(secondReq, createRequestContext(createInjector())).subscribe({
                    next: secondResult => {
                        expect(secondResult).toBe('done');
                        expect(secondReq.paths).toEqual({ id: '42' });
                        expect(calls).toEqual(['first:42', 'second:42', 'first:42', 'second:42']);
                        done();
                    },
                    error: done
                });
            },
            error: done
        });
    });

    it('bounds URL caches for high-cardinality dynamic routes', async () => {
        const router = new OptimizedRouter(
            createInjector(),
            formatter,
            '',
            Transport.HTTP,
            { maxCacheSize: 3 },
            undefined,
            false
        );
        router.use('/users/:id', (input: any) => of(input.url));

        for (let i = 0; i < 20; i++) {
            const request = { url: `/users/${i}`, method: 'GET' } as any;
            const route = await router.getRoute(request, createRequestContext(createInjector()));
            expect(route).toBeTruthy();
            expect(request.paths).toEqual({ id: String(i) });
        }

        expect((router as any).cache.size).toBeLessThanOrEqual(3);
        expect((router as any).params.size).toBeLessThanOrEqual(3);
        expect((router as any).matchCache.size).toBeLessThanOrEqual(3);
    });

    it('evicts a batch instead of clearing the whole cache at capacity', async () => {
        const router = new OptimizedRouter(
            createInjector(),
            formatter,
            '',
            Transport.HTTP,
            { maxCacheSize: 8 },
            undefined,
            false
        );
        router.use('/items/:id', (input: any) => of(input.url));
        const context = () => createRequestContext(createInjector());

        for (let i = 0; i < 8; i++) {
            await router.getRoute({ url: `/items/${i}`, method: 'GET' } as any, context());
        }
        expect((router as any).cache.size).toEqual(8);
        expect((router as any).params.size).toEqual(8);

        await router.getRoute({ url: '/items/8', method: 'GET' } as any, context());

        // Batch eviction keeps most entries; a full clear would leave one.
        expect((router as any).cache.size).toBeGreaterThan(2);
        expect((router as any).cache.has('/items/8')).toBe(true);
        expect((router as any).params.size).toBeGreaterThan(2);
    });

    it('removes dynamic routes and their patterns on unuse', async () => {
        const router = createRouter();
        const context = createRequestContext(createInjector());
        const route = { path: '/dynamic', pattern: '/dynamic', handle: () => of('dynamic') } as any;

        router.use(route);
        expect(router.routes).toContain(route);
        expect(router.getPatterns().routes).toContain('/dynamic');
        expect(await router.getRoute({ url: '/dynamic', method: 'GET' } as any, context)).toBeTruthy();

        router.unuse(route);

        expect(router.routes).not.toContain(route);
        expect(router.getPatterns().routes).not.toContain('/dynamic');
        expect(await router.getRoute(
            { url: '/dynamic', method: 'GET' } as any,
            createRequestContext(createInjector())
        )).toBeUndefined();
    });

    it('deduplicates concurrent lazy route loads', async () => {
        const router = createRouter();
        let loads = 0;
        router.use({
            path: '/lazy',
            loadChildren: async () => {
                loads += 1;
                await new Promise(resolve => setTimeout(resolve, 10));
                return [{
                    path: '/child',
                    pattern: '/child',
                    handle: () => of('lazy-child')
                }];
            }
        } as any);

        const [first, second] = await Promise.all([
            router.getRoute(
                { url: '/lazy/child', method: 'GET' } as any,
                createRequestContext(createInjector())
            ),
            router.getRoute(
                { url: '/lazy/child', method: 'GET' } as any,
                createRequestContext(createInjector())
            )
        ]);

        expect(loads).toBe(1);
        expect(first).toBeTruthy();
        expect(second).toBeTruthy();
    });

    it('manages dynamic route sources with revisions and change events', async () => {
        const router = createRouter();
        const context = createRequestContext(createInjector());
        const changes: any[] = [];
        const subscription = router.changes.subscribe(change => changes.push(change));
        const a = { path: '/source-a', pattern: '/source-a', handle: () => of('a') } as any;
        const b = { path: '/source-b', pattern: '/source-b', handle: () => of('b') } as any;
        const c = { path: '/source-c', pattern: '/source-c', handle: () => of('c') } as any;

        try {
            router.registerRoutes('source-a', [a]);
            expect(router.routes).toContain(a);
            expect(router.snapshot().routes).toContain(a);
            expect(router.listRouteSources().map(item => item.source)).toEqual(['source-a']);
            expect(router.revision).toBeGreaterThan(0);
            expect(await router.getRoute({ url: '/source-a', method: 'GET' } as any, context)).toBeTruthy();

            router.replaceRoutes('source-a', [b]);
            expect(router.routes).not.toContain(a);
            expect(router.routes).toContain(b);
            expect(await router.getRoute(
                { url: '/source-a', method: 'GET' } as any,
                createRequestContext(createInjector())
            )).toBeUndefined();
            expect(await router.getRoute(
                { url: '/source-b', method: 'GET' } as any,
                createRequestContext(createInjector())
            )).toBeTruthy();

            router.removeRoutes('source-a');
            expect(router.routes).not.toContain(b);
            expect(router.listRouteSources()).toEqual([]);

            router.resetRoutes([c]);
            expect(router.routes).toEqual([c]);
            expect(await router.getRoute(
                { url: '/source-c', method: 'GET' } as any,
                createRequestContext(createInjector())
            )).toBeTruthy();

            expect(changes.map(change => change.type)).toEqual([
                'register', 'replace', 'remove', 'reset'
            ]);
            expect(changes.map(change => change.revision)).toEqual(
                changes.map(change => change.revision).slice().sort((left, right) => left - right)
            );
        } finally {
            subscription.unsubscribe();
        }
    });

    it('orders compiled routes by specificity and reports conflicts', () => {
        const router = createRouter();
        const handle = () => of('static');
        const wildcard = { path: '/users/*', pattern: '/users/*', method: 'GET', handle: () => of('wildcard') } as any;
        const param = { path: '/users/:id', pattern: '/users/:id', method: 'GET', handle: () => of('param') } as any;
        const staticRoute = { path: '/users/new', pattern: '/users/new', method: 'GET', handle } as any;
        const duplicate = { path: '/users/new', pattern: '/users/new', method: 'GET', handle } as any;

        router.registerRoutes('ordered', [wildcard, param, staticRoute, duplicate]);

        expect(router.compiledTable().routes.map(route => route.path)).toEqual([
            '/users/new',
            '/users/:id',
            '/users/*'
        ]);
        expect(router.getRouteConflicts().length).toBe(1);
        expect(router.getRouteConflicts()[0].path).toBe('/users/new');
        expect(router.snapshot().conflicts.length).toBe(1);
    });

    it('uses explicit route priority before declaration order', async () => {
        const router = createRouter();
        router.use({
            path: '/priority',
            pattern: '/priority',
            method: 'GET',
            priority: 1,
            handle: () => of('low')
        } as any);
        const low = await new Promise<any>((resolve, reject) => {
            router.handle(
                { url: '/priority', method: 'GET' } as any,
                createRequestContext(createInjector())
            ).subscribe({ next: resolve, error: reject });
        });
        expect(low).toBe('low');

        router.use({
            path: '/priority',
            pattern: '/priority',
            method: 'GET',
            priority: 10,
            handle: () => of('high')
        } as any);
        const result = await new Promise<any>((resolve, reject) => {
            router.handle(
                { url: '/priority', method: 'GET' } as any,
                createRequestContext(createInjector())
            ).subscribe({ next: resolve, error: reject });
        });
        expect(result).toBe('high');
    });

    it('emits change events for manual use and unuse', () => {
        const router = createRouter();
        const changes: any[] = [];
        const subscription = router.changes.subscribe(change => changes.push(change));
        try {
            router.use('/manual', () => of('manual'));
            expect(changes.at(-1)?.type).toBe('use');
            expect(router.revision).toBeGreaterThan(0);

            router.unuse(router.routes.find(route => route.path === '/manual')!);
            expect(changes.at(-1)?.type).toBe('unuse');
        } finally {
            subscription.unsubscribe();
        }
    });

    it('reloads lazy route sources after the loader resolves', async () => {
        const router = createRouter();
        let version = 'a';
        router.registerLazyRoutes('lazy-source', async () => [{
            path: `/lazy-${version}`,
            pattern: `/lazy-${version}`,
            handle: () => of(version)
        } as any]);

        await router.reloadRoutes('lazy-source');
        expect(router.listRouteSources().map(item => item.source)).toEqual(['lazy-source']);
        expect(router.routes.some(route => route.path === '/lazy-a')).toBe(true);

        version = 'b';
        await router.reloadRoutes('lazy-source');
        expect(router.routes.some(route => route.path === '/lazy-a')).toBe(false);
        expect(router.routes.some(route => route.path === '/lazy-b')).toBe(true);

        router.removeRoutes('lazy-source');
        await router.reloadRoutes('lazy-source');
        expect(router.routes.some(route => route.path === '/lazy-b')).toBe(false);
    });

    it('revalidates cached misses after a route is registered later', async () => {
        const router = createRouter();
        const first = await router.getRoute(
            { url: '/late', method: 'GET' } as any,
            createRequestContext(createInjector())
        );
        expect(first).toBeUndefined();

        router.use('/late', () => of('late'));
        const second = await router.getRoute(
            { url: '/late', method: 'GET' } as any,
            createRequestContext(createInjector())
        );
        expect(second).toBeTruthy();
    });
});
