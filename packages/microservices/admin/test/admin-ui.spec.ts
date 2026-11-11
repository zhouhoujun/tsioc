import expect = require('expect');
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentRef } from '@tsdi/components';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { DOCUMENT } from '@tsdi/common';
import { GatewayAdminComponent } from '../web/admin.component';
import { GatewayAdminAppModule } from '../web/admin.module';
import { compileGatewayRules } from '../src/rules';

async function flush(): Promise<void> {
    for (let index = 0; index < 4; index++) {
        await Promise.resolve();
    }
    await new Promise(resolve => setTimeout(resolve, 0));
}

async function waitFor(check: () => boolean, timeoutMs = 2500): Promise<void> {
    const started = Date.now();
    while (!check() && Date.now() - started < timeoutMs) {
        await flush();
    }
}

function jsonResponse(body: any, status = 200): any {
    return {
        ok: status >= 200 && status < 300,
        status,
        url: 'http://localhost/',
        headers: new Headers({ 'content-type': 'application/json' }),
        async json() { return body; },
        async text() { return JSON.stringify(body); }
    };
}

describe('Microservice admin UI', () => {
    let ctx: ApplicationContext;
    let ref: ComponentRef<GatewayAdminComponent>;
    let root: any;
    let originalFetch: any;
    let routes: any[];
    let rules: any[];

    beforeEach(async () => {
        routes = [{ path: '/api/users', service: 'users-service' }];
        rules = [];
        originalFetch = (globalThis as any).fetch;
        (globalThis as any).fetch = async (url: string, init: any = {}) => {
            const path = String(url).replace(/^https?:\/\/[^/]+/, '');
            const method = String(init.method || 'GET').toUpperCase();
            if (path === '/api/gateway-admin/state' && method === 'GET') {
                return jsonResponse({ routes, rules, services: ['users-service'] });
            }
            if (path === '/api/gateway-admin/rules' && method === 'GET') {
                return jsonResponse([]);
            }
            if (path === '/api/gateway-admin/routes' && method === 'PUT') {
                routes = JSON.parse(init.body).routes;
                return jsonResponse({ routes, rules, services: ['users-service'] });
            }
            if (path.startsWith('/api/gateway-admin/rules/') && method === 'PUT') {
                const definition = JSON.parse(init.body);
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
        };

        ctx = await Application.run(GatewayAdminComponent, {
            deps: [HtmlTemplateModule, GatewayAdminAppModule],
            providers: [{
                provide: DOCUMENT,
                useFactory: () => {
                    const { JSDOM } = require('jsdom');
                    return new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', { url: 'http://localhost/admin/' }).window.document;
                }
            }]
        });
        ref = ctx.runners.getRef(GatewayAdminComponent) as ComponentRef<GatewayAdminComponent>;
        root = ref.hostView.rootNodes[0] as any;
        await waitFor(() => root.querySelectorAll('.ga-nav-item').length === 3);
        await waitFor(() => (root.querySelector('.ga-status')?.textContent || '').includes('Ready'));
    });

    afterEach(async () => {
        (globalThis as any).fetch = originalFetch;
        await ctx?.close();
    });

    it('renders a dashboard and keeps the visual designer closed by default', () => {
        expect(root.matches('.ga-shell')).toBe(true);
        expect(root.querySelectorAll('.ga-nav-item').length).toBe(3);
        expect(root.querySelectorAll('.ga-metric').length).toBe(4);
        expect(root.querySelector('.ga-designer-page')).toBeFalsy();
        expect(root.querySelector('.ga-status').textContent).toContain('Ready');
    });

    it('switches language and theme globally', async () => {
        expect(root.querySelector('.ga-nav-item')?.textContent).toContain('Overview');

        const menuTrigger = root.querySelector('.ga-global-menu .menu-bar-trigger') as any;
        expect(menuTrigger).toBeTruthy();
        menuTrigger.click();
        await flush();
        (root.querySelector('[data-menu-id="language:zh-CN"]') as any).click();
        await waitFor(() => (root.querySelector('.ga-nav-item')?.textContent || '').includes('概览'));
        expect(root.querySelector('.ga-nav-item')?.textContent).toContain('概览');
        expect(root.querySelector('.ga-topbar-title h1')?.textContent).toContain('概览');

        (root.querySelector('.ga-global-menu .menu-bar-trigger') as any).click();
        await flush();
        (root.querySelector('[data-menu-id="theme:dark"]') as any).click();
        await flush();
        expect(root.ownerDocument.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('guards hash routes and restores the page from the URL', async () => {
        const win = root.ownerDocument.defaultView as any;
        win.location.hash = '#/rules';
        win.dispatchEvent(new win.HashChangeEvent('hashchange'));
        await flush();
        expect(root.querySelector('.ga-page-rules')).toBeTruthy();
        expect(root.querySelector('.ga-edit-rules')).toBeTruthy();

        win.location.hash = '#/routes';
        win.dispatchEvent(new win.HashChangeEvent('hashchange'));
        await flush();
        expect(root.querySelector('.ga-page-routes')).toBeTruthy();
    });

    it('edits and applies routes through the route table and drawer', async () => {
        (root.querySelector('.ga-nav-item:nth-child(2)') as any).click();
        await flush();
        expect(root.ownerDocument.defaultView.location.hash).toBe('#/routes');
        expect(root.querySelectorAll('.ga-route-row').length).toBe(1);

        (root.querySelector('.ga-add-route') as any).click();
        await flush();
        expect(root.querySelector('.ga-route-editor, .ga-modal-card')).toBeTruthy();

        const pathInput = root.querySelector('.ga-modal-card [data-field="path"]') as any;
        const serviceInput = root.querySelector('.ga-modal-card [data-field="service"]') as any;
        pathInput.value = '/api/orders';
        pathInput.dispatchEvent(new (root.ownerDocument.defaultView as any).Event('input', { bubbles: true }));
        serviceInput.value = 'orders-service';
        serviceInput.dispatchEvent(new (root.ownerDocument.defaultView as any).Event('input', { bubbles: true }));
        await flush();
        (root.querySelector('.ga-route-save') as any).click();
        await flush();
        expect(root.querySelectorAll('.ga-route-row').length).toBe(2);

        (root.querySelector('.ga-apply-routes') as any).click();
        await waitFor(() => (root.querySelector('.ga-status')?.textContent || '').includes('Routes applied'));
        expect(routes.length).toBe(2);
        expect(routes[1].path).toBe('/api/orders');
    });

    it('opens the activity designer only when configuring rules, then applies compiled rules', async () => {
        (root.querySelector('.ga-nav-item:nth-child(3)') as any).click();
        await flush();
        expect(root.querySelector('.ga-designer-page')).toBeFalsy();

        (root.querySelector('.ga-edit-rules') as any).click();
        await waitFor(() => !!root.querySelector('.ga-designer-page'));
        expect(root.querySelectorAll('.workflow-node').length).toBeGreaterThanOrEqual(4);
        expect(root.querySelectorAll('.workflow-palette-item[data-node-type^="gateway-"]').length).toBe(3);

        (root.querySelector('.ga-rules-apply') as any).click();
        await waitFor(() => (root.querySelector('.ga-status')?.textContent || '').includes('Rules applied'));
        expect(rules.length).toBe(2);
        expect(rules[0].action.type).toBe('route');
        expect(rules[1].action.type).toBe('deny');
        expect(root.querySelector('.ga-status').textContent).toContain('Rules applied');
    });
});
