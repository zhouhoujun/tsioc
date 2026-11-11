import expect = require('expect');
import { WorkflowNodeRegistry, VisualWorkflowDefinition } from '@tsdi/activities';
import {
    compileGatewayRules,
    createGatewayRuleWorkflow,
    GATEWAY_RULE_NODE_TYPES,
    registerGatewayRuleNodes
} from '../src';

describe('gateway rule workflow', () => {
    it('registers gateway nodes in the designer registry', () => {
        const registry = registerGatewayRuleNodes(new WorkflowNodeRegistry());
        expect(registry.has(GATEWAY_RULE_NODE_TYPES.route)).toBe(true);
        expect(registry.has(GATEWAY_RULE_NODE_TYPES.condition)).toBe(true);
        expect(registry.has(GATEWAY_RULE_NODE_TYPES.deny)).toBe(true);
    });

    it('compiles the starter workflow into ordered route and deny rules', () => {
        const result = compileGatewayRules(createGatewayRuleWorkflow('zh-CN'));
        expect(result.errors).toEqual([]);
        expect(result.rules.length).toBe(2);

        const [route, deny] = result.rules;
        expect(route.action.type).toBe('route');
        expect(route.action.service).toBe('admin-service');
        expect(route.action.targetUrl).toBe('http://127.0.0.1:3002');
        expect(route.when).toEqual([
            { field: 'header', name: 'x-role', operator: 'equals', value: 'admin' }
        ]);
        expect(deny.action.type).toBe('deny');
        expect(deny.action.status).toBe(403);
        expect(deny.when).toEqual([
            { field: 'header', name: 'x-role', operator: 'not-equals', value: 'admin' }
        ]);
    });

    it('accumulates nested conditions and negates false branches', () => {
        const definition: VisualWorkflowDefinition = {
            id: 'rules',
            name: 'rules',
            nodes: [
                { id: 'start', name: 'start', type: 'start', position: { x: 0, y: 0 } },
                {
                    id: 'c1', name: 'path', type: GATEWAY_RULE_NODE_TYPES.condition as any,
                    position: { x: 100, y: 0 },
                    config: { field: 'path', operator: 'prefix', value: '/api' }
                },
                {
                    id: 'c2', name: 'method', type: GATEWAY_RULE_NODE_TYPES.condition as any,
                    position: { x: 200, y: 0 },
                    config: { field: 'method', operator: 'equals', value: 'GET' }
                },
                {
                    id: 'route', name: 'route', type: GATEWAY_RULE_NODE_TYPES.route as any,
                    position: { x: 300, y: 0 },
                    config: { service: 'api-service', stripPrefix: true, timeout: '1500', cache: '{"enabled":true,"ttl":1000}' }
                },
                {
                    id: 'deny', name: 'deny', type: GATEWAY_RULE_NODE_TYPES.deny as any,
                    position: { x: 300, y: 100 },
                    config: { status: '429', message: 'slow down', body: '{"error":"slow"}' }
                }
            ],
            connections: [
                { id: 'e1', sourceNodeId: 'start', sourcePort: 'out', targetNodeId: 'c1', targetPort: 'in' },
                { id: 'e2', sourceNodeId: 'c1', sourcePort: 'true', targetNodeId: 'c2', targetPort: 'in' },
                { id: 'e3', sourceNodeId: 'c2', sourcePort: 'true', targetNodeId: 'route', targetPort: 'in' },
                { id: 'e4', sourceNodeId: 'c2', sourcePort: 'false', targetNodeId: 'deny', targetPort: 'in' }
            ]
        };

        const result = compileGatewayRules(definition);
        expect(result.errors).toEqual([]);
        expect(result.rules.length).toBe(2);

        const route = result.rules.find(rule => rule.action.type === 'route')!;
        expect(route.action.path).toBe('/api');
        expect(route.action.stripPrefix).toBe(true);
        expect(route.action.timeout).toBe(1500);
        expect(route.action.cache).toEqual({ enabled: true, ttl: 1000 });
        expect(route.when).toEqual([
            { field: 'path', operator: 'prefix', value: '/api' },
            { field: 'method', operator: 'equals', value: 'GET' }
        ]);

        const deny = result.rules.find(rule => rule.action.type === 'deny')!;
        expect(deny.action.status).toBe(429);
        expect(deny.action.message).toBe('slow down');
        expect(deny.action.body).toEqual({ error: 'slow' });
        expect(deny.when).toEqual([
            { field: 'path', operator: 'prefix', value: '/api' },
            { field: 'method', operator: 'not-equals', value: 'GET' }
        ]);
    });

    it('parses dotted condition fields and reports invalid routes', () => {
        const definition: VisualWorkflowDefinition = {
            id: 'rules',
            name: 'rules',
            nodes: [
                { id: 'start', name: 'start', type: 'start', position: { x: 0, y: 0 } },
                {
                    id: 'c1', name: 'hint', type: GATEWAY_RULE_NODE_TYPES.condition as any,
                    position: { x: 100, y: 0 },
                    config: { field: 'input.header.x-tenant', operator: 'exists' }
                },
                {
                    id: 'route', name: 'broken route', type: GATEWAY_RULE_NODE_TYPES.route as any,
                    position: { x: 200, y: 0 },
                    config: {}
                }
            ],
            connections: [
                { id: 'e1', sourceNodeId: 'start', sourcePort: 'out', targetNodeId: 'c1', targetPort: 'in' },
                { id: 'e2', sourceNodeId: 'c1', sourcePort: 'true', targetNodeId: 'route', targetPort: 'in' }
            ]
        };
        const result = compileGatewayRules(definition);
        expect(result.rules.length).toBe(0);
        expect(result.errors[0]).toContain('requires a service or targetUrl');
    });
});
