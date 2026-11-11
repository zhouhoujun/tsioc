import expect = require('expect');
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentRef } from '@tsdi/components';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { DOCUMENT } from '@tsdi/common';
import { DOMWindow, JSDOM } from 'jsdom';
import { GatewayRouteOptions, GatewayRuleOptions } from '@tsdi/gateway';
import { GatewayAdminAppComponent } from '../web/app.component';
import { GatewayAdminAppModule } from '../web/admin.module';
import { compileGatewayRules } from '../src/rules';

interface BrowserGlobals {
    window?: DOMWindow;
    location?: Location;
    history?: History;
    document?: Document;
    fetch?: typeof fetch;
}

async function flush(): Promise<void> {
    for (let index = 0; index < 6; index++) {
        await Promise.resolve();
    }
    await new Promise(resolve => setTimeout(resolve, 0));
}

async function waitFor(check: () => boolean, timeoutMs = 4000): Promise<void> {
    const started = Date.now();
    while (!check() && Date.now() - started < timeoutMs) {
        await flush();
    }
}

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' }
    });
}

describe('Microservice admin UI', () => {
    const globals = globalThis as unknown as BrowserGlobals;
    let ctx: ApplicationContext;
    let ref: ComponentRef<GatewayAdminAppComponent>;
    let root: Element;
    let win: DOMWindow;
    let originalFetch: typeof fetch | undefined;
    let originalWindow: DOMWindow | undefined;
    let originalLocation: Location | undefined;
    let originalHistory: History | undefined;
    let originalDocument: Document | undefined;
    let routes: GatewayRouteOptions[];
    let rules: GatewayRuleOptions[];

    beforeEach(async () => {
        routes = [{ path: '/api/users', service: 'users-service' }];
        rules = [];
        originalFetch = globals.fetch;
        originalWindow = globals.window;
        originalLocation = globals.location;
        originalHistory = globals.history;
        originalDocument = globals.document;
        globals.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
            const path = String(input).replace(/^https?:\/\/[^/]+/, '');
            const method = String(init.method || 'GET').toUpperCase();
            if (path === '/api/gateway-admin/session' && method === 'GET') {
                return jsonResponse({ authenticated: true, user: null, authEnabled: false });
            }
            if (path === '/api/gateway-admin/state' && method === 'GET') {
                return jsonResponse({ routes, rules, services: ['users-service'], auth: { enabled: false, mode: 'none' } });
            }
            if (path === '/api/gateway-admin/rules' && method === 'GET') {
                return jsonResponse([]);
            }
            if (path === '/api/gateway-admin/routes' && method === 'PUT') {
                routes = JSON.parse(String(init.body)).routes;
                return jsonResponse({ routes, rules, services: ['users-service'] });
            }
            if (path.startsWith('/api/gateway-admin/rules/') && method === 'PUT') {
                const definition = JSON.parse(String(init.body));
                const compiled = compileGatewayRules(definition);
                if (compiled.errors.length) {
                    return jsonResponse({ message: compiled.errors.join('; ') }, 400);
                }
                rules = compiled.rules;
                return jsonResponse({
                    summary: { id: definition.id, name: definition.name, nodeCount: definition.nodes.length },
                    definition,
                    rules
                });
            }
            return jsonResponse({ message: 'not found' }, 404);
        }) as typeof fetch;

        const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
            url: 'http://localhost/admin/',
            pretendToBeVisual: true
        });
        win = dom.window;
        globals.window = win;
        globals.location = win.location;
        globals.history = win.history;
        globals.document = win.document;

        ctx = await Application.run(GatewayAdminAppComponent, {
            deps: [HtmlTemplateModule, GatewayAdminAppModule],
            providers: [{ provide: DOCUMENT, useValue: win.document }]
        });
        ref = ctx.runners.getRef(GatewayAdminAppComponent) as ComponentRef<GatewayAdminAppComponent>;
        root = ref.elementRef.nativeElement as Element;
        win.document.body.appendChild(root);
        await waitFor(() => root.querySelectorAll('.ga-nav-item').length === 3);
        await waitFor(() => (root.querySelector('.ga-status')?.textContent || '').includes('Ready'));
        await waitFor(() => !!root.querySelector('.ga-metric'));
    });

    afterEach(async () => {
        globals.fetch = originalFetch;
        globals.window = originalWindow;
        globals.location = originalLocation;
        globals.history = originalHistory;
        globals.document = originalDocument;
        await ctx?.close();
    });

    it('renders the routed dashboard inside the layout outlet', () => {
        expect(root.querySelector('.ga-shell')).toBeTruthy();
        expect(root.querySelectorAll('.ga-nav-item').length).toBe(3);
        expect(root.querySelectorAll('.ga-metric').length).toBe(4);
        expect(root.querySelector('.ga-designer-page')).toBeFalsy();
        expect(root.querySelector('.ga-status')?.textContent).toContain('Ready');
        expect(win.location.hash).toBe('#/dashboard');
    });

    it('switches language and theme globally', async () => {
        expect(root.querySelector('.ga-nav-item')?.textContent).toContain('Overview');

        const menuTrigger = root.querySelector('.ga-global-menu .menu-bar-trigger') as HTMLElement;
        expect(menuTrigger).toBeTruthy();
        menuTrigger.click();
        await flush();
        (root.querySelector('[data-menu-id="language:zh-CN"]') as HTMLElement).click();
        await waitFor(() => (root.querySelector('.ga-nav-item')?.textContent || '').includes('概览'));
        expect(root.querySelector('.ga-nav-item')?.textContent).toContain('概览');
        expect(root.querySelector('.ga-topbar-title h1')?.textContent).toContain('概览');

        (root.querySelector('.ga-global-menu .menu-bar-trigger') as HTMLElement).click();
        await flush();
        (root.querySelector('[data-menu-id="theme:dark"]') as HTMLElement).click();
        await flush();
        expect(win.document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('swaps the outlet content when the route changes', async () => {
        expect(root.querySelector('.ga-metric')).toBeTruthy();

        win.location.hash = '#/rules';
        win.dispatchEvent(new win.HashChangeEvent('hashchange'));
        await waitFor(() => !!root.querySelector('.ga-page-rules'));
        expect(root.querySelector('.ga-page-rules')).toBeTruthy();
        expect(root.querySelector('.ga-edit-rules')).toBeTruthy();
        expect(root.querySelector('.ga-metric')).toBeFalsy();

        win.location.hash = '#/routes';
        win.dispatchEvent(new win.HashChangeEvent('hashchange'));
        await waitFor(() => !!root.querySelector('.ga-page-routes'));
        expect(root.querySelector('.ga-page-routes')).toBeTruthy();
        expect(root.querySelector('.ga-page-rules')).toBeFalsy();
    });

    it('renders the NotFound page for unknown routes', async () => {
        win.location.hash = '#/missing/page';
        win.dispatchEvent(new win.HashChangeEvent('hashchange'));
        await waitFor(() => !!root.querySelector('.ga-page-not-found'));
        expect(root.querySelector('.ga-page-not-found')).toBeTruthy();
        expect(root.querySelector('.ga-not-found-code')?.textContent).toContain('404');
        expect(root.querySelector('.ga-topbar-title h1')?.textContent).toContain('not found');
        expect(root.querySelector('.ga-metric')).toBeFalsy();
    });

    it('edits and applies routes through the route table and drawer', async () => {
        (root.querySelector('.ga-nav-item:nth-child(2)') as HTMLElement).click();
        await waitFor(() => !!root.querySelector('.ga-page-routes'));
        expect(win.location.hash).toBe('#/routes');
        expect(root.querySelectorAll('.ga-route-row').length).toBe(1);

        (root.querySelector('.ga-add-route') as HTMLElement).click();
        await flush();
        expect(root.querySelector('.ga-modal-card')).toBeTruthy();

        const pathInput = root.querySelector('.ga-modal-card [data-field="path"]') as HTMLInputElement;
        const serviceInput = root.querySelector('.ga-modal-card [data-field="service"]') as HTMLInputElement;
        pathInput.value = '/api/orders';
        pathInput.dispatchEvent(new win.Event('input', { bubbles: true }));
        serviceInput.value = 'orders-service';
        serviceInput.dispatchEvent(new win.Event('input', { bubbles: true }));
        await flush();
        (root.querySelector('.ga-route-save') as HTMLElement).click();
        await flush();
        expect(root.querySelectorAll('.ga-route-row').length).toBe(2);

        (root.querySelector('.ga-apply-routes') as HTMLElement).click();
        await waitFor(() => (root.querySelector('.ga-status')?.textContent || '').includes('Routes applied'));
        expect(routes.length).toBe(2);
        expect(routes[1].path).toBe('/api/orders');
    });

    it('opens the activity designer only when configuring rules, then applies compiled rules', async () => {
        (root.querySelector('.ga-nav-item:nth-child(3)') as HTMLElement).click();
        await waitFor(() => !!root.querySelector('.ga-page-rules'));
        expect(root.querySelector('.ga-designer-page')).toBeFalsy();

        (root.querySelector('.ga-edit-rules') as HTMLElement).click();
        await waitFor(() => !!root.querySelector('.ga-designer-page'));
        expect(root.querySelectorAll('.workflow-node').length).toBeGreaterThanOrEqual(4);
        expect(root.querySelectorAll('.workflow-palette-item[data-node-type^="gateway-"]').length).toBe(3);

        (root.querySelector('.ga-rules-apply') as HTMLElement).click();
        await waitFor(() => (root.querySelector('.ga-status')?.textContent || '').includes('Rules applied'));
        expect(rules.length).toBe(2);
        expect(root.querySelector('.ga-status')?.textContent).toContain('Rules applied');
    });
});
