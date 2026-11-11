import expect = require('expect');
import { InMemoryWorkflowDefinitionStore } from '@tsdi/activities';
import { GatewayOptions, GatewayRuntime } from '@tsdi/gateway';
import { GatewayAdminController } from '../src';
import { createGatewayRuleWorkflow } from '../src';

describe('GatewayAdminController', () => {
    function createController(options: GatewayOptions = { routes: [] }) {
        const runtime = new GatewayRuntime();
        const store = new InMemoryWorkflowDefinitionStore();
        const controller = new GatewayAdminController(runtime, options, store);
        return { controller, runtime, store };
    }

    it('exposes the current routes, rules and services', () => {
        const { controller } = createController({
            routes: [
                { path: '/api/users', service: 'users-service' },
                { path: '/api/orders', service: 'orders-service' }
            ]
        });
        const state = controller.getState();
        expect(state.routes.length).toBe(2);
        expect(state.services).toEqual(['orders-service', 'users-service']);
    });

    it('applies edited routes to the live gateway runtime', () => {
        const { controller, runtime } = createController();
        controller.updateRoutes({
            routes: [{ path: '/api/users', service: 'users-service' }]
        });
        expect(runtime.getRoutes([]).length).toBe(1);
        expect(runtime.getRoutes([])[0].service).toBe('users-service');

        controller.resetRoutes();
        expect(runtime.getDynamicOptions().routes).toBeUndefined();
    });

    it('saves and applies a visual rule workflow', async () => {
        const { controller, runtime } = createController();
        const definition = createGatewayRuleWorkflow('en');
        const saved = await controller.saveRule(definition.id, definition);

        expect(saved.rules.length).toBe(2);
        expect(runtime.getRules([]).length).toBe(2);
        expect((await controller.listRules()).length).toBe(1);
    });

    it('rejects invalid rule workflows without touching the runtime', async () => {
        const { controller, runtime } = createController();
        const invalid = {
            id: 'broken',
            name: 'broken',
            nodes: [
                { id: 'start', name: 'start', type: 'start', position: { x: 0, y: 0 } },
                {
                    id: 'route', name: 'route', type: 'gateway-route',
                    position: { x: 100, y: 0 }, config: {}
                }
            ],
            connections: [
                { id: 'e1', sourceNodeId: 'start', sourcePort: 'out', targetNodeId: 'route', targetPort: 'in' }
            ]
        } as any;
        await expect(controller.saveRule('broken', invalid)).rejects.toThrow('requires a service or targetUrl');
        expect(runtime.getRules([])).toEqual([]);
    });
});
