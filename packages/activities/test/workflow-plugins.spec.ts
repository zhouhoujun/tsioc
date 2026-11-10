import expect = require('expect');
import { createInjector } from '@tsdi/ioc';
import { WorkflowNodeRegistry } from '../src/visual/node-registry';
import { VisualWorkflowService } from '../src/visual/VisualWorkflowService';
import { VisualWorkflowDefinition } from '../src/visual/types';
import { WorkflowPluginRegistry } from '../src/plugins/plugin-registry';
import { WorkflowServiceRegistry } from '../src/plugins/service-registry';
import { WorkflowPlugin } from '../src/plugins/types';
import { createBuiltInWorkflowPlugin, listBuiltInWorkflowPlugins } from '../src/plugins/catalog';

function createPlugin(disposed: { value: boolean }): WorkflowPlugin {
    return {
        id: 'demo',
        name: 'Demo plugin',
        services: () => ({
            demo: {
                calls: 0,
                dispose() { disposed.value = true; }
            }
        }),
        nodes: [{
            type: 'demo-echo',
            label: 'Demo echo',
            description: 'Echo a payload through the plugin service',
            category: 'action',
            icon: '◆',
            color: '#0f766e',
            inputs: [{ id: 'in', name: 'in', type: 'input', label: 'Input' }],
            outputs: [{ id: 'out', name: 'out', type: 'output', label: 'Output' }],
            fields: [{ key: 'payload', label: 'Payload', type: 'json' }],
            defaultConfig: { payload: {} },
            execute: async (node, context) => {
                const service = (context as any).services.demo;
                service.calls += 1;
                return { success: true, data: { nodeId: node.id, echoed: node.config?.payload } };
            }
        }]
    };
}

function definition(): VisualWorkflowDefinition {
    return {
        id: 'plugin-flow',
        name: 'Plugin flow',
        nodes: [
            { id: 'start', name: 'Start', type: 'start', position: { x: 0, y: 0 } },
            {
                id: 'echo', name: 'Echo', type: 'demo-echo', position: { x: 200, y: 0 },
                config: { payload: { ok: true } }, requiresServer: true, pluginId: 'demo',
                inputs: [{ id: 'in', name: 'in', type: 'input', label: 'Input' }],
                outputs: [{ id: 'out', name: 'out', type: 'output', label: 'Output' }]
            },
            { id: 'end', name: 'End', type: 'end', position: { x: 400, y: 0 } }
        ],
        connections: [
            { id: 'c1', sourceNodeId: 'start', sourcePort: 'out', targetNodeId: 'echo', targetPort: 'in' },
            { id: 'c2', sourceNodeId: 'echo', sourcePort: 'out', targetNodeId: 'end', targetPort: 'in' }
        ]
    };
}

describe('workflow plugins', () => {
    it('installs nodes/services and executes plugin nodes', async () => {
        const nodes = new WorkflowNodeRegistry();
        const services = new WorkflowServiceRegistry();
        const plugins = new WorkflowPluginRegistry(nodes, services);
        const disposed = { value: false };

        expect(await plugins.install(createPlugin(disposed))).toBe(true);
        expect(await plugins.install(createPlugin(disposed))).toBe(false);
        expect(plugins.isInstalled('demo')).toBe(true);
        expect(nodes.has('demo-echo')).toBe(true);
        expect(nodes.get('demo-echo')?.requiresServer).toBe(true);
        expect(nodes.get('demo-echo')?.pluginId).toBe('demo');
        expect(services.has('demo')).toBe(true);
        expect(plugins.list()[0].nodes[0].type).toBe('demo-echo');
        expect(JSON.stringify(plugins.list())).not.toContain('execute');

        const injector = createInjector();
        const execution = new VisualWorkflowService(injector, nodes, plugins);
        const result = await execution.execute(definition(), {});
        expect(result.success).toBe(true);
        expect(result.data?.executionState?.nodeStates?.echo?.status).toBe('success');
        expect(services.get('demo').calls).toBe(1);

        expect(await plugins.uninstall('demo')).toBe(true);
        expect(plugins.isInstalled('demo')).toBe(false);
        expect(nodes.has('demo-echo')).toBe(false);
        expect(services.has('demo')).toBe(false);
        expect(disposed.value).toBe(true);
    });

    it('exposes the bundled mqtt/redis/nats/coap catalog as manifests', () => {
        const manifests = listBuiltInWorkflowPlugins();
        expect(manifests.map(item => item.id).sort()).toEqual(['coap', 'mqtt', 'nats', 'redis']);
        expect(manifests.every(item => item.nodes.length > 0)).toBe(true);
        expect(JSON.stringify(manifests)).not.toContain('execute');
        expect(createBuiltInWorkflowPlugin('mqtt')?.nodes?.map(node => node.type)).toContain('mqtt-publish');
        expect(createBuiltInWorkflowPlugin('redis')?.nodes?.map(node => node.type)).toContain('redis-command');
        expect(createBuiltInWorkflowPlugin('nats')?.nodes?.map(node => node.type)).toContain('nats-request');
        expect(createBuiltInWorkflowPlugin('coap')?.nodes?.map(node => node.type)).toContain('coap-request');
        expect(createBuiltInWorkflowPlugin('missing')).toBeUndefined();
    });

    it('fails plugin nodes clearly when the host has no plugin executor', async () => {
        const nodes = new WorkflowNodeRegistry();
        const services = new WorkflowServiceRegistry();
        const plugins = new WorkflowPluginRegistry(nodes, services);
        const injector = createInjector();
        const execution = new VisualWorkflowService(injector, nodes, plugins);
        const result = await execution.execute(definition(), {});
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('requires an installed workflow plugin');
    });
});
