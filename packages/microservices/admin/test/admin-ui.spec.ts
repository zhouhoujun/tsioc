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

async function waitFor(check: () => boolean, timeoutMs = 2000): Promise<void> {
    const started = Date.now();
    while (!check() && Date.now() - started < timeoutMs) {
        await flush();
    }
}

function jsonResponse(body: any, status = 200): any {
    return {
        ok: status >= 200 && status < 300,
        status,
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
                const body = JSON.parse(init.body);
                routes = body.routes;
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
                    return new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>').window.document;
                }
            }]
        });
        ref = ctx.runners.getRef(GatewayAdminComponent) as ComponentRef<GatewayAdminComponent>;
        root = ref.hostView.rootNodes[0] as any;
        await waitFor(() => root.querySelectorAll('.ga-route-card').length === 1);
    });

    afterEach(async () => {
        (globalThis as any).fetch = originalFetch;
        await ctx?.close();
    });

    it('renders the route table and the activity-based rule designer', () => {
        expect(root.matches('.ga-shell')).toBe(true);
        expect(root.querySelectorAll('.ga-route-card').length).toBe(1);
        expect((root.querySelector('.ga-routes .ga-input-path') as any).value).toBe('/api/users');
        expect(root.querySelectorAll('.workflow-node').length).toBeGreaterThanOrEqual(4);
        const gatewayNodes = root.querySelectorAll('.workflow-palette-item[data-node-type^="gateway-"]');
        expect(gatewayNodes.length).toBe(3);
        expect((root.querySelector('.ga-status') as any).textContent).toContain('Ready');
    });

    it('adds routes and applies them through the admin API', async () => {
        const buttons = root.querySelectorAll('.ga-routes .ga-actions .ga-btn');
        (buttons[0] as any).click();
        await flush();
        expect(root.querySelectorAll('.ga-route-card').length).toBe(2);

        (buttons[1] as any).click();
        await waitFor(() => ((root.querySelector('.ga-status') as any)?.textContent || '').includes('Routes applied'));
        expect(routes.length).toBe(2);
        expect((root.querySelector('.ga-status') as any).textContent).toContain('Routes applied');
    });

    it('saves the visual workflow and applies compiled gateway rules', async () => {
        (root.querySelector('.ga-rules .ga-actions .ga-btn-primary') as any).click();
        await waitFor(() => ((root.querySelector('.ga-status') as any)?.textContent || '').includes('Rules applied'));
        expect(rules.length).toBe(2);
        expect(rules[0].action.type).toBe('route');
        expect(rules[1].action.type).toBe('deny');
        expect((root.querySelector('.ga-status') as any).textContent).toContain('Rules applied');
    });
});
