import expect = require('expect');
import { GatewayRuleOptions } from '../src/gateway.options';
import { GatewayRuleEngine, ruleToRoute } from '../src/gateway.rule-engine';
import { GatewayInterceptor } from '../src/gateway.interceptor';
import { GatewayRuntime } from '../src/gateway.runtime';

function context(overrides: Partial<{
    path: string;
    method: string;
    host: string;
    headers: Record<string, string | undefined>;
    query: Record<string, string | undefined>;
}> = {}) {
    return {
        path: overrides.path ?? '/api/users',
        method: overrides.method ?? 'GET',
        host: overrides.host ?? 'api.example.com',
        header: (name: string) => overrides.headers?.[name],
        query: (name: string) => overrides.query?.[name]
    };
}

describe('GatewayRuleEngine', () => {
    it('sorts enabled rules by priority then declaration order', () => {
        const rules: GatewayRuleOptions[] = [
            { id: 'third', priority: 20, when: [{ field: 'path', operator: 'prefix', value: '/' }], action: { type: 'route' } },
            { id: 'disabled', priority: -10, enabled: false, when: [], action: { type: 'route' } },
            { id: 'first', priority: 10, when: [{ field: 'path', operator: 'prefix', value: '/' }], action: { type: 'route' } },
            { id: 'second', priority: 10, when: [{ field: 'path', operator: 'prefix', value: '/' }], action: { type: 'route' } }
        ];

        const engine = new GatewayRuleEngine(rules);

        expect(engine.size).toBe(3);
        expect(engine.match(context())?.id).toBe('first');
    });

    it('evaluates every operator', () => {
        const check = (operator: any, value: string | undefined, ctx = context({ path: '/api/users/42' })) =>
            GatewayRuleEngine.matchesCondition({ field: 'path', operator, value } as any, ctx);

        expect(check('equals', '/api/users/42')).toBe(true);
        expect(check('not-equals', '/api/orders')).toBe(true);
        expect(check('prefix', '/api/users')).toBe(true);
        expect(check('not-prefix', '/api/orders')).toBe(true);
        expect(check('exists', '')).toBe(true);
        expect(check('not-exists', '')).toBe(false);
        expect(check('not-exists', undefined, context({ path: '' }))).toBe(true);
    });

    it('reads header and query conditions from the context', () => {
        const rule: GatewayRuleOptions = {
            when: [
                { field: 'header', name: 'x-tenant', operator: 'equals', value: 'acme' },
                { field: 'query', name: 'debug', operator: 'exists' }
            ],
            action: { type: 'route' }
        };
        const engine = new GatewayRuleEngine([rule]);

        expect(engine.match(context({
            headers: { 'x-tenant': 'acme' },
            query: { debug: '1' }
        }))).toBe(rule);

        expect(engine.match(context({ headers: { 'x-tenant': 'other' } }))).toBeNull();
    });

    it('treats unknown condition fields as non-matching', () => {
        const engine = new GatewayRuleEngine([{
            when: [{ field: 'unknown' as any, value: 'x' }],
            action: { type: 'route' }
        }]);

        expect(engine.match(context())).toBeNull();
    });
});

describe('ruleToRoute', () => {
    it('derives the path from the action or the path condition', () => {
        expect(ruleToRoute({
            when: [{ field: 'path', operator: 'prefix', value: '/legacy' }],
            action: { type: 'route', service: 'svc' }
        }).path).toBe('/legacy');

        expect(ruleToRoute({
            when: [{ field: 'path', operator: 'prefix', value: '/legacy' }],
            action: { type: 'route', path: '/explicit', service: 'svc' }
        }).path).toBe('/explicit');
    });

    it('copies forwarding options and always enables the route', () => {
        const route = ruleToRoute({
            action: {
                type: 'route',
                service: 'users',
                targetPath: '/v2',
                headers: { 'x-rule': '1' },
                timeout: 500
            }
        });

        expect(route).toMatchObject({
            service: 'users',
            targetPath: '/v2',
            headers: { 'x-rule': '1' },
            timeout: 500,
            enabled: true
        });
    });
});

describe('GatewayInterceptor rule engine caching', () => {
    it('rebuilds rules when the config revision changes', () => {
        const runtime = new GatewayRuntime();
        const interceptor = new GatewayInterceptor(
            {
                routes: [],
                rules: [{ id: 'a', when: [{ field: 'path', operator: 'prefix', value: '/' }], action: { type: 'route', service: 'svc-a' } }]
            } as any,
            null,
            null,
            runtime
        );

        expect(interceptor.previewMatch({ path: '/api' }).rule?.id).toBe('a');

        runtime.setDynamicOptions({
            rules: [{ id: 'b', when: [{ field: 'path', operator: 'prefix', value: '/' }], action: { type: 'route', service: 'svc-b' } }]
        });

        expect(interceptor.previewMatch({ path: '/api' }).rule?.id).toBe('b');
    });
});
