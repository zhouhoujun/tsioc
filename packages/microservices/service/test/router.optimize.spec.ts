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
    body: any;
    error: any;
    code: any;
    message?: string;
    headersSent = false;

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
        return this.code != null || this.body != null || this.error != null;
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
                return this.code;
            case 'statusMessage':
                return this.message;
            case 'error':
                return this.error;
            case 'body':
            case 'payload':
                return name ? this.body?.[name] : this.body;
            case 'query':
                return name ? this.request?.query?.[name] : this.request?.query;
            case 'path':
                return name ? this.request?.paths?.[name] : this.request?.paths;
            default:
                return undefined;
        }
    }

    write(body: any): void {
        this.body = body;
    }

    setHeader(name: string, value: any): void {
        this.headers.set(name.toLowerCase(), value);
    }

    removeHeader(name: string): void {
        this.headers.delete(name.toLowerCase());
    }

    writeError(error: any): void {
        this.error = error;
    }

    setStatus(code: any, message?: string): void {
        this.code = code;
        this.message = message;
    }

    getStatus(): any {
        return this.code;
    }

    getStatusMessage(): any {
        return this.message;
    }

    getError(): any {
        return this.error;
    }

    getBody(): any {
        return this.body;
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
        adapter404.writeError(new NotFoundException());
        context404.setMessageAdapter(adapter404);
        const request404 = { url: '/alive', method: 'GET' } as any;

        router.use('/alive', () => of('ok'));

        router.handle(request404, context404).subscribe({
            next: result => {
                expect(result).toBe('ok');

                const context500 = createRequestContext(createInjector());
                const adapter500 = new TestStatusAdapter();
                adapter500.setStatus(500);
                adapter500.writeError(new Error('boom'));
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
});
