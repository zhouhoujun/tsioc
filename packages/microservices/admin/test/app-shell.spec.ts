import expect = require('expect');
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentRef } from '@tsdi/components';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { DOCUMENT } from '@tsdi/common';
import { GatewayAdminAppComponent } from '../web/app.component';
import { GatewayAdminAppModule } from '../web/admin.module';

async function flush(): Promise<void> {
    for (let index = 0; index < 8; index++) {
        await Promise.resolve();
    }
    await new Promise(resolve => setTimeout(resolve, 0));
}

async function waitFor(check: () => boolean, timeoutMs = 3000): Promise<void> {
    const started = Date.now();
    while (!check() && Date.now() - started < timeoutMs) {
        await flush();
    }
}

function jsonResponse(body: any, status = 200): any {
    const payload = new TextEncoder().encode(JSON.stringify(body));
    return {
        ok: status >= 200 && status < 300,
        status,
        url: 'http://localhost/',
        headers: new Headers({ 'content-type': 'application/json' }),
        body: new ReadableStream({
            start(controller) {
                controller.enqueue(payload);
                controller.close();
            }
        }),
        async json() { return body; },
        async text() { return JSON.stringify(body); }
    };
}

describe('Gateway admin app shell', () => {
    let ctx: ApplicationContext | undefined;
    let originalFetch: any;
    let originalWindow: any;
    let originalLocation: any;
    let originalHistory: any;

    beforeEach(() => {
        originalFetch = (globalThis as any).fetch;
        originalWindow = (globalThis as any).window;
        originalLocation = (globalThis as any).location;
        originalHistory = (globalThis as any).history;
    });

    afterEach(async () => {
        (globalThis as any).fetch = originalFetch;
        (globalThis as any).window = originalWindow;
        (globalThis as any).location = originalLocation;
        (globalThis as any).history = originalHistory;
        await ctx?.close();
        ctx = undefined;
    });

    async function boot(): Promise<{ root: any; win: any }> {
        const { JSDOM } = require('jsdom');
        const dom = new JSDOM('<!DOCTYPE html><html><head></head><body><div id="gateway-admin-app"></div></body></html>', {
            url: 'http://localhost/admin/',
            pretendToBeVisual: true
        });
        const win: any = dom.window;
        (globalThis as any).window = win;
        (globalThis as any).location = win.location;
        (globalThis as any).history = win.history;

        ctx = await Application.run(GatewayAdminAppComponent, {
            deps: [HtmlTemplateModule, GatewayAdminAppModule],
            providers: [{ provide: DOCUMENT, useValue: win.document }]
        });
        const ref = ctx.runners.getRef(GatewayAdminAppComponent) as ComponentRef<GatewayAdminAppComponent>;
        win.document.getElementById('gateway-admin-app')!.appendChild((ref as any).elementRef.nativeElement);
        return { root: (ref as any).elementRef.nativeElement, win };
    }

    it('does not create the protected page component when the session is missing', async () => {
        (globalThis as any).fetch = async (url: string) => {
            const path = String(url).replace(/^https?:\/\/[^/]+/, '');
            if (path === '/api/gateway-admin/session') {
                return jsonResponse({ authenticated: false }, 401);
            }
            return jsonResponse({ message: 'unauthorized' }, 401);
        };

        const { root } = await boot();
        await waitFor(() => false, 400);

        expect(root.querySelector('gateway-admin')).toBeNull();
        expect(root.querySelector('.ga-shell')).toBeNull();
        expect(root.querySelector('.ga-page')).toBeNull();
    });

    it('renders the route component through the router outlet when authenticated', async () => {
        (globalThis as any).fetch = async (url: string) => {
            const path = String(url).replace(/^https?:\/\/[^/]+/, '');
            if (path === '/api/gateway-admin/session') {
                return jsonResponse({ authenticated: true, user: null, authEnabled: false });
            }
            if (path === '/api/gateway-admin/state') {
                return jsonResponse({ routes: [], rules: [], services: [], auth: { enabled: false, mode: 'none' } });
            }
            return jsonResponse({ message: 'not found' }, 404);
        };

        const { root, win } = await boot();
        await waitFor(() => !!root.querySelector('.ga-shell'));
        expect(root.querySelector('.ga-shell')).toBeTruthy();
        expect(root.querySelector('.ga-metric')).toBeTruthy();
        expect(win.location.hash).toBe('#/dashboard');
    });
});
