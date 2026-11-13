import expect = require('expect');
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentRef } from '@tsdi/components';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { DOCUMENT } from '@tsdi/common';
import { DOMWindow, JSDOM } from 'jsdom';
import { GatewayRouteOptions, GatewayRuleOptions } from '@tsdi/gateway';
import { GatewayAdminAppComponent } from '../web/app.component';
import { GatewayAdminBootstrapSession } from '../web/auth.guard';
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
    let staticRoutes: GatewayRouteOptions[];
    let rules: GatewayRuleOptions[];
    let ruleWorkflows: Array<{ id: string; name: string; nodeCount: number }>;
    let definitions: Record<string, Record<string, unknown>>;
    let configVersion: number;

    beforeEach(async () => {
        routes = [{ path: '/api/users', service: 'users-service' }];
        staticRoutes = routes.map(route => ({ ...route }));
        rules = [{
            id: 'seeded-rule',
            name: 'Seeded rule',
            priority: 1,
            when: [{ field: 'path', operator: 'prefix', value: '/admin' }],
            action: { type: 'deny', status: 403 }
        }];
        ruleWorkflows = [];
        definitions = {};
        configVersion = 1;
        originalFetch = globals.fetch;
        originalWindow = globals.window;
        originalLocation = globals.location;
        originalHistory = globals.history;
        originalDocument = globals.document;
        globals.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
            const path = String(input).replace(/^https?:\/\/[^/]+/, '');
            const method = String(init.method || 'GET').toUpperCase();
            if (path === '/api/gateway-admin/state' && method === 'GET') {
                return jsonResponse({ routes, rules, services: ['users-service'], version: configVersion, auth: { enabled: false, mode: 'none' } });
            }
            if (path === '/api/gateway-admin/config' && method === 'GET') {
                return jsonResponse({ version: configVersion, options: {} });
            }
            if (path === '/api/gateway-admin/config/history' && method === 'GET') {
                return jsonResponse([{
                    version: 1,
                    timestamp: '2026-11-13T00:00:00.000Z',
                    source: 'admin',
                    diff: {
                        routes: { added: ['/api/new:users-service'], removed: [], changed: [] },
                        rules: { added: [], removed: [], changed: [] },
                        options: []
                    }
                }]);
            }
            if (path === '/api/gateway-admin/config/apply' && method === 'POST') {
                const body = JSON.parse(String(init.body));
                const diff = {
                    routes: { added: ['/api/new:users-service'], removed: [], changed: [] },
                    rules: { added: [], removed: [], changed: [] },
                    options: []
                };
                if (body.dryRun) {
                    return jsonResponse({ version: configVersion, applied: false, dryRun: true, diff, warnings: [] });
                }
                if (Array.isArray(body.routes)) {
                    routes = body.routes;
                }
                configVersion++;
                return jsonResponse({ version: configVersion, applied: true, dryRun: false, diff, warnings: [] });
            }
            if (path === '/api/gateway-admin/config/rollback' && method === 'POST') {
                configVersion++;
                return jsonResponse({
                    version: configVersion,
                    applied: true,
                    dryRun: false,
                    diff: { routes: { added: [], removed: [], changed: [] }, rules: { added: [], removed: [], changed: [] }, options: [] },
                    warnings: []
                });
            }
            if (path === '/api/gateway-admin/services' && method === 'GET') {
                return jsonResponse([{
                    name: 'users-service',
                    endpoints: [
                        { id: 'users-1', address: '10.0.0.11:8080', status: 'UP', weight: 10 },
                        { id: 'users-2', address: '10.0.0.12:8080', status: 'DOWN', weight: 0 }
                    ]
                }]);
            }
            if (path === '/api/gateway-admin/diagnostics' && method === 'GET') {
                return jsonResponse({
                    cacheEntries: 4,
                    activeRequests: 3,
                    evictedEndpoints: 0,
                    circuits: [{ key: 'a', failures: 0, open: false }, { key: 'b', failures: 2, open: true }],
                    bulkheads: []
                });
            }
            if (path === '/api/gateway-admin/rules' && method === 'GET') {
                return jsonResponse(ruleWorkflows);
            }
            if (path.startsWith('/api/gateway-admin/rules/') && method === 'GET') {
                const id = decodeURIComponent(path.slice('/api/gateway-admin/rules/'.length));
                return definitions[id]
                    ? jsonResponse(definitions[id])
                    : jsonResponse({ message: 'not found' }, 404);
            }
            if (path.startsWith('/api/gateway-admin/rules/') && method === 'DELETE') {
                const id = decodeURIComponent(path.slice('/api/gateway-admin/rules/'.length));
                delete definitions[id];
                ruleWorkflows = ruleWorkflows.filter(item => item.id !== id);
                return jsonResponse({ removed: true });
            }
            if (path === '/api/gateway-admin/routes' && method === 'PUT') {
                const body = JSON.parse(String(init.body));
                if (body.expectedVersion != null && body.expectedVersion !== configVersion) {
                    return jsonResponse({ message: 'conflict' }, 409);
                }
                routes = body.routes;
                configVersion++;
                return jsonResponse({ routes, rules, services: ['users-service'], version: configVersion });
            }
            if (path === '/api/gateway-admin/routes' && method === 'DELETE') {
                routes = staticRoutes.map(route => ({ ...route }));
                configVersion++;
                return jsonResponse({ routes, rules, services: ['users-service'], version: configVersion });
            }
            if (path === '/api/gateway-admin/match' && method === 'POST') {
                const body = JSON.parse(String(init.body));
                if (String(body.path).startsWith('/blocked')) {
                    return jsonResponse({
                        matchedBy: 'rule',
                        request: body,
                        rule: {
                            id: 'deny-rule',
                            name: 'Blocked paths',
                            priority: 0,
                            when: [{ field: 'path', operator: 'prefix', value: '/blocked' }],
                            action: { type: 'deny', status: 403 }
                        }
                    });
                }
                return jsonResponse({
                    matchedBy: 'route',
                    request: body,
                    route: { path: '/api/users', service: 'users-service', methods: ['GET'] }
                });
            }
            if (path.startsWith('/api/gateway-admin/rules/') && path.endsWith('/apply') && method === 'POST') {
                return jsonResponse({ rules });
            }
            if (path.startsWith('/api/gateway-admin/rules/') && method === 'PUT') {
                const definition = JSON.parse(String(init.body));
                const compiled = compileGatewayRules(definition);
                if (compiled.errors.length) {
                    return jsonResponse({ message: compiled.errors.join('; ') }, 400);
                }
                rules = compiled.rules;
                definitions[definition.id] = definition;
                const summary = { id: definition.id, name: definition.name, nodeCount: definition.nodes.length };
                const existing = ruleWorkflows.findIndex(item => item.id === definition.id);
                if (existing >= 0) {
                    ruleWorkflows[existing] = summary;
                } else {
                    ruleWorkflows.push(summary);
                }
                return jsonResponse({ summary, definition, rules });
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
        (win as unknown as { __TSDI_ADMIN_SESSION__?: GatewayAdminBootstrapSession }).__TSDI_ADMIN_SESSION__ = {
            authenticated: true,
            authEnabled: true,
            user: { sub: 'admin', email: 'admin@example.com' }
        };

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

    it('renders the routed dashboard inside the layout outlet', async () => {
        expect(root.querySelector('.ga-shell')).toBeTruthy();
        expect(root.querySelectorAll('.ga-nav-item').length).toBe(3);
        expect(root.querySelectorAll('.ga-metric').length).toBe(4);
        expect(root.querySelector('.ga-designer-page')).toBeFalsy();
        expect(root.querySelector('.ga-status')?.textContent).toContain('Ready');
        expect(win.location.hash).toBe('#/dashboard');
        await waitFor(() => (root.querySelector('.ga-service-endpoints')?.textContent || '').includes('10.0.0.11'));
        expect(root.querySelector('.ga-service-row')?.textContent).toContain('users-service');
        expect(root.querySelector('.ga-service-endpoints')?.textContent).toContain('10.0.0.11:8080');
        expect(root.querySelectorAll('.ga-policy-row').length).toBeGreaterThan(0);
        expect(root.querySelectorAll('.ga-runtime-row').length).toBe(3);
        expect(root.querySelector('.ga-runtime-row')?.textContent).toContain('3');
    });

    it('switches language and theme globally', async () => {
        expect(root.querySelector('.ga-nav-item')?.textContent).toContain('Overview');

        const menuTrigger = root.querySelector('.ga-global-menu .menu-bar-trigger') as HTMLElement;
        expect(menuTrigger).toBeTruthy();
        menuTrigger.click();
        await flush();
        (root.querySelector('[data-menu-id="menu:language"]') as HTMLElement).click();
        await flush();
        (root.querySelector('[data-menu-id="language:zh-CN"]') as HTMLElement).click();
        await waitFor(() => (root.querySelector('.ga-nav-item')?.textContent || '').includes('概览'));
        expect(root.querySelector('.ga-nav-item')?.textContent).toContain('概览');
        expect(root.querySelector('.ga-topbar-title h1')?.textContent).toContain('概览');

        (root.querySelector('.ga-global-menu .menu-bar-trigger') as HTMLElement).click();
        await flush();
        (root.querySelector('[data-menu-id="menu:theme"]') as HTMLElement).click();
        await flush();
        (root.querySelector('[data-menu-id="theme:dark"]') as HTMLElement).click();
        await flush();
        expect(win.document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('keeps the host theme after closing the embedded rules designer', async () => {
        const menuTrigger = root.querySelector('.ga-global-menu .menu-bar-trigger') as HTMLElement;
        menuTrigger.click();
        await flush();
        (root.querySelector('[data-menu-id="menu:theme"]') as HTMLElement).click();
        await flush();
        (root.querySelector('[data-menu-id="theme:dark"]') as HTMLElement).click();
        await flush();
        expect(win.document.documentElement.getAttribute('data-theme')).toBe('dark');

        (root.querySelector('.ga-nav-item:nth-child(3)') as HTMLElement).click();
        await waitFor(() => !!root.querySelector('.ga-page-rules'));
        (root.querySelector('.ga-edit-rules') as HTMLElement).click();
        await waitFor(() => !!root.querySelector('.ga-designer-page'));
        expect(win.document.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(root.querySelector('workflow-designer-preview .workflow-designer')?.getAttribute('data-theme')).toBe('dark');

        (root.querySelector('.ga-rules-cancel') as HTMLElement).click();
        await waitFor(() => !root.querySelector('.ga-designer-page'));
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

    it('validates route paths and duplicate routes before staging', async () => {
        (root.querySelector('.ga-nav-item:nth-child(2)') as HTMLElement).click();
        await waitFor(() => !!root.querySelector('.ga-page-routes'));

        (root.querySelector('.ga-add-route') as HTMLElement).click();
        await flush();
        const pathInput = root.querySelector('.ga-modal-card [data-field="path"]') as HTMLInputElement;
        pathInput.value = 'api/bad';
        pathInput.dispatchEvent(new win.Event('input', { bubbles: true }));
        (root.querySelector('.ga-route-save') as HTMLElement).click();
        await flush();
        expect(root.querySelector('.ga-field-error')?.textContent).toContain('/');
        expect(root.querySelectorAll('.ga-route-row').length).toBe(1);

        pathInput.value = '/api/bad';
        pathInput.dispatchEvent(new win.Event('input', { bubbles: true }));
        (root.querySelector('.ga-route-save') as HTMLElement).click();
        await flush();
        expect(root.querySelectorAll('.ga-route-row').length).toBe(2);

        // A second route with the same path/methods is rejected.
        (root.querySelector('.ga-add-route') as HTMLElement).click();
        await flush();
        const duplicatePath = root.querySelector('.ga-modal-card [data-field="path"]') as HTMLInputElement;
        duplicatePath.value = '/api/bad';
        duplicatePath.dispatchEvent(new win.Event('input', { bubbles: true }));
        (root.querySelector('.ga-route-save') as HTMLElement).click();
        await flush();
        expect(root.querySelector('.ga-field-error')?.textContent).toContain('already exists');
        expect(root.querySelectorAll('.ga-route-row').length).toBe(2);
    });

    it('toggles, duplicates and reorders staged routes', async () => {
        (root.querySelector('.ga-nav-item:nth-child(2)') as HTMLElement).click();
        await waitFor(() => !!root.querySelector('.ga-page-routes'));

        const firstRow = () => root.querySelectorAll('.ga-route-row')[0];
        (firstRow().querySelector('.ga-pill-button') as HTMLElement).click();
        await flush();
        expect(firstRow().querySelector('.ga-pill-button')?.textContent).toContain('disabled');
        expect(root.querySelector('.ga-dirty')).toBeTruthy();

        const duplicate = Array.from(firstRow().querySelectorAll('.ga-link-btn'))
            .find(button => button.textContent?.includes('Duplicate')) as HTMLElement;
        duplicate.click();
        await flush();
        expect(root.querySelectorAll('.ga-route-row').length).toBe(2);
        expect(root.querySelectorAll('.ga-route-row')[1].textContent).toContain('/api/users-copy');

        const moveDown = Array.from(firstRow().querySelectorAll('.ga-link-btn'))
            .find(button => button.textContent?.includes('Move down')) as HTMLElement;
        moveDown.click();
        await flush();
        expect(firstRow().textContent).toContain('/api/users-copy');
    });

    it('filters staged routes by enabled state', async () => {
        (root.querySelector('.ga-nav-item:nth-child(2)') as HTMLElement).click();
        await waitFor(() => !!root.querySelector('.ga-page-routes'));

        const duplicate = Array.from(root.querySelectorAll('.ga-route-row')[0].querySelectorAll('.ga-link-btn'))
            .find(button => button.textContent?.includes('Duplicate')) as HTMLElement;
        duplicate.click();
        await flush();
        expect(root.querySelectorAll('.ga-route-row').length).toBe(2);

        (root.querySelectorAll('.ga-route-row')[0].querySelector('.ga-pill-button') as HTMLElement).click();
        await flush();

        const filter = root.querySelector('.ga-route-filter') as HTMLSelectElement;
        expect(filter).toBeTruthy();
        filter.value = 'disabled';
        filter.dispatchEvent(new win.Event('change', { bubbles: true }));
        await flush();
        expect(root.querySelectorAll('.ga-route-row').length).toBe(1);
        expect(root.querySelector('.ga-route-row')?.textContent).toContain('disabled');

        filter.value = 'enabled';
        filter.dispatchEvent(new win.Event('change', { bubbles: true }));
        await flush();
        expect(root.querySelectorAll('.ga-route-row').length).toBe(1);
        expect(root.querySelector('.ga-route-row')?.textContent).toContain('enabled');

        filter.value = 'all';
        filter.dispatchEvent(new win.Event('change', { bubbles: true }));
        await flush();
        expect(root.querySelectorAll('.ga-route-row').length).toBe(2);
    });

    it('previews config changes and rolls back to a history version', async () => {
        (root.querySelector('.ga-nav-item:nth-child(2)') as HTMLElement).click();
        await waitFor(() => !!root.querySelector('.ga-page-routes'));

        expect(root.querySelector('.ga-config-version')?.textContent).toContain('v1');

        (root.querySelector('.ga-preview-config') as HTMLElement).click();
        await waitFor(() => !!root.querySelector('.ga-config-diff'));
        const diff = root.querySelector('.ga-config-diff')?.textContent || '';
        expect(diff).toContain('/api/new:users-service');
        expect(diff).toContain('Pending changes');
        (root.querySelector('.ga-config-diff .ga-icon-btn') as HTMLElement).click();
        await waitFor(() => !root.querySelector('.ga-config-diff'));

        (root.querySelector('.ga-config-history') as HTMLElement).click();
        await waitFor(() => !!root.querySelector('.ga-config-history-row'));
        const row = root.querySelector('.ga-config-history-row');
        expect(row?.textContent).toContain('v1');
        expect(row?.textContent).toContain('1 change');
        (root.querySelector('.ga-rollback-config') as HTMLElement).click();
        await waitFor(() => (root.querySelector('.ga-status')?.textContent || '').includes('rolled back'));
        expect(root.querySelector('.ga-status')?.textContent).toContain('rolled back');
        expect(root.querySelector('.ga-config-history-row')).toBeFalsy();
    });

    it('previews rule and route matches from the routes page', async () => {
        (root.querySelector('.ga-nav-item:nth-child(2)') as HTMLElement).click();
        await waitFor(() => !!root.querySelector('.ga-page-routes'));

        const pathInput = root.querySelector('.ga-match-path') as HTMLInputElement;
        pathInput.value = '/api/users/42';
        pathInput.dispatchEvent(new win.Event('input', { bubbles: true }));
        (root.querySelector('.ga-match-run') as HTMLElement).click();
        await waitFor(() => !!root.querySelector('.ga-match-result'));
        expect(root.querySelector('.ga-match-result')?.textContent).toContain('Matched route');
        expect(root.querySelector('.ga-match-result')?.textContent).toContain('users-service');

        pathInput.value = '/blocked/path';
        pathInput.dispatchEvent(new win.Event('input', { bubbles: true }));
        (root.querySelector('.ga-match-run') as HTMLElement).click();
        await waitFor(() => (root.querySelector('.ga-match-result')?.textContent || '').includes('Matched rule'));
        expect(root.querySelector('.ga-match-result')?.textContent).toContain('Blocked paths');
    });

    it('opens a compiled rule detail with its conditions and action', async () => {
        (root.querySelector('.ga-nav-item:nth-child(3)') as HTMLElement).click();
        await waitFor(() => !!root.querySelector('.ga-page-rules'));
        (root.querySelector('.ga-view-rule') as HTMLElement).click();
        await waitFor(() => !!root.querySelector('.ga-rule-detail, .ga-detail-card'));
        const detail = root.querySelector('.ga-detail-card')?.textContent || '';
        expect(detail).toContain('Seeded rule');
        expect(detail).toContain('deny');
        (root.querySelector('.ga-detail-card .ga-icon-btn') as HTMLElement).click();
        await waitFor(() => !root.querySelector('.ga-detail-card'));
    });

    it('creates a new rule workflow and applies a saved workflow from the list', async () => {
        (root.querySelector('.ga-nav-item:nth-child(3)') as HTMLElement).click();
        await waitFor(() => !!root.querySelector('.ga-page-rules'));

        (root.querySelector('.ga-new-rules') as HTMLElement).click();
        await waitFor(() => !!root.querySelector('.ga-designer-page'));
        expect(root.querySelectorAll('.workflow-node').length).toBeGreaterThanOrEqual(2);
        (root.querySelector('.ga-rules-cancel') as HTMLElement).click();
        await waitFor(() => !root.querySelector('.ga-designer-page'));

        (root.querySelector('.ga-edit-rules') as HTMLElement).click();
        await waitFor(() => !!root.querySelector('.ga-designer-page'));
        (root.querySelector('.ga-rules-apply') as HTMLElement).click();
        await waitFor(() => (root.querySelector('.ga-status')?.textContent || '').includes('Rules applied'));
        await waitFor(() => !!root.querySelector('.ga-workflow-row'));

        (root.querySelector('.ga-apply-rule-workflow') as HTMLElement).click();
        await waitFor(() => (root.querySelector('.ga-status')?.textContent || '').includes('Rules applied'));
        expect(root.querySelectorAll('.ga-workflow-row').length).toBeGreaterThan(0);
    });

    it('views, imports and resets routes from the route toolbar', async () => {
        (root.querySelector('.ga-nav-item:nth-child(2)') as HTMLElement).click();
        await waitFor(() => !!root.querySelector('.ga-page-routes'));

        (root.querySelector('.ga-view-route') as HTMLElement).click();
        await waitFor(() => !!root.querySelector('.ga-detail-card'));
        expect(root.querySelector('.ga-json')?.textContent).toContain('/api/users');
        (root.querySelector('.ga-route-json-edit') as HTMLElement).click();
        await waitFor(() => !!root.querySelector('.ga-route-json-save'));
        const jsonTextarea = root.querySelector('.ga-detail-card .ga-import-textarea') as HTMLTextAreaElement;
        jsonTextarea.value = JSON.stringify({ path: '/api/users/edited', service: 'users-service', rateLimit: { limit: 5, windowMs: 1000 } });
        jsonTextarea.dispatchEvent(new win.Event('input', { bubbles: true }));
        (root.querySelector('.ga-route-json-save') as HTMLElement).click();
        await waitFor(() => !root.querySelector('.ga-detail-card'));
        require('fs').writeFileSync('/tmp/route-json-debug.json', JSON.stringify({
            detail: !!root.querySelector('.ga-detail-card'),
            rows: root.querySelectorAll('.ga-route-row').length,
            html: root.querySelector('.ga-page-routes')?.innerHTML.slice(0, 600)
        }));
        expect(root.querySelector('.ga-route-row')?.textContent).toContain('/api/users/edited');
        expect(root.querySelector('.ga-dirty')).toBeTruthy();

        (root.querySelector('.ga-import-routes') as HTMLElement).click();
        await waitFor(() => !!root.querySelector('.ga-import-textarea'));
        const textarea = root.querySelector('.ga-import-textarea') as HTMLTextAreaElement;
        textarea.value = JSON.stringify([
            { path: '/api/users', service: 'users-service' },
            { path: '/api/orders', service: 'orders-service' }
        ]);
        textarea.dispatchEvent(new win.Event('input', { bubbles: true }));
        (root.querySelector('.ga-import-apply') as HTMLElement).click();
        await waitFor(() => root.querySelectorAll('.ga-route-row').length === 2);

        (root.querySelector('.ga-reset-routes') as HTMLElement).click();
        await waitFor(() => root.querySelectorAll('.ga-route-row').length === 1);
        expect(routes.length).toBe(1);
        expect(root.querySelector('.ga-route-row')?.textContent).toContain('/api/users');
    });

    it('duplicates a saved rule workflow from the list', async () => {
        (root.querySelector('.ga-nav-item:nth-child(3)') as HTMLElement).click();
        await waitFor(() => !!root.querySelector('.ga-page-rules'));
        (root.querySelector('.ga-edit-rules') as HTMLElement).click();
        await waitFor(() => !!root.querySelector('.ga-designer-page'));
        (root.querySelector('.ga-rules-apply') as HTMLElement).click();
        await waitFor(() => !!root.querySelector('.ga-workflow-row'));

        const before = root.querySelectorAll('.ga-workflow-row').length;
        (root.querySelector('.ga-duplicate-rule-workflow') as HTMLElement).click();
        await waitFor(() => root.querySelectorAll('.ga-workflow-row').length === before + 1);
        const rows = Array.from(root.querySelectorAll('.ga-workflow-row'));
        expect(rows.length).toBe(before + 1);
        expect(rows[rows.length - 1].textContent).toContain('copy');
        expect(root.querySelector('.ga-status')?.textContent).toContain('duplicated');
    });

    it('lists saved rule workflows and allows reopening and deleting them', async () => {
        (root.querySelector('.ga-nav-item:nth-child(3)') as HTMLElement).click();
        await waitFor(() => !!root.querySelector('.ga-page-rules'));

        (root.querySelector('.ga-edit-rules') as HTMLElement).click();
        await waitFor(() => !!root.querySelector('.ga-designer-page'));
        (root.querySelector('.ga-rules-apply') as HTMLElement).click();
        await waitFor(() => (root.querySelector('.ga-status')?.textContent || '').includes('Rules applied'));
        await waitFor(() => !!root.querySelector('.ga-workflow-row'));

        const row = root.querySelector('.ga-workflow-row') as HTMLElement;
        expect(row.textContent).toContain('nodes');

        const open = Array.from(row.querySelectorAll('.ga-link-btn'))
            .find(button => button.textContent?.includes('Open')) as HTMLElement;
        open.click();
        await waitFor(() => !!root.querySelector('.ga-designer-page'));
        (root.querySelector('.ga-rules-cancel') as HTMLElement).click();
        await waitFor(() => !root.querySelector('.ga-designer-page'));

        const current = root.querySelector('.ga-workflow-row') as HTMLElement;
        const remove = Array.from(current.querySelectorAll('.ga-link-btn'))
            .find(button => button.textContent?.includes('Remove')) as HTMLElement;
        remove.click();
        await waitFor(() => !root.querySelector('.ga-workflow-row'));
        expect(root.querySelectorAll('.ga-workflow-row').length).toBe(0);
    });
});
