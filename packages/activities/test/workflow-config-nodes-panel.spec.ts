import expect = require('expect');
import { createInjector, InjectUtil } from '@tsdi/ioc';
import { WorkflowModule } from '../src/workflow.module';
import { WorkflowNodeRegistry } from '../src/visual/node-registry';
import { WorkflowDesigner } from '../src/visual/workflow-designer';
import { VisualWorkflowService } from '../src/visual/VisualWorkflowService';
import { WorkflowConfigNodesComponent } from '../src/visual/components/workflow-config-nodes.component';
import { configNodesSignature } from '../src/visual/workflow-config-nodes';

describe('Workflow configuration-node index', () => {
    let registry: WorkflowNodeRegistry;
    let designer: WorkflowDesigner;

    beforeEach(() => {
        const injector = createInjector();
        InjectUtil.use(injector, WorkflowModule);
        registry = injector.get(WorkflowNodeRegistry);
        designer = new WorkflowDesigner({ registry, service: injector.get(VisualWorkflowService) });
    });

    function panel(): WorkflowConfigNodesComponent {
        const component = new WorkflowConfigNodesComponent();
        component.designer = designer;
        component.registry = registry;
        component.locale = 'en';
        return component;
    }

    it('groups records by resource and keeps empty groups so New is reachable', () => {
        const broker = designer.addNode('mqtt', { x: 80, y: 80 }, {
            name: 'prod', config: { url: 'mqtt://prod:1883' }
        })!;
        designer.addNode('mqtt-out', { x: 300, y: 120 }, {
            config: { mqtt: broker.id, topic: 'sensors/temp' }
        });

        const groups = panel().groups;
        expect(groups.map(group => group.resource)).toEqual(['mqtt-broker', 'tls', 'websocket-listener']);
        expect(groups[0].type).toBe('mqtt');
        expect(groups[0].items.map(item => item.name)).toEqual(['prod']);
        expect(groups[0].items[0].summary).toBe('mqtt://prod:1883');
        expect(groups[0].items[0].usedBy.length).toBe(1);
        // Empty groups still offer their create button.
        expect(groups[1].items).toEqual([]);
        expect(groups[1].type).toBe('tls');
        expect(groups[2].items).toEqual([]);
        expect(groups[2].type).toBe('websocket');
    });

    it('labels usage and distinguishes used from unused records', () => {
        const used = designer.addNode('mqtt', { x: 80, y: 80 }, { config: { url: 'mqtt://used:1883' } })!;
        const unused = designer.addNode('mqtt', { x: 80, y: 200 }, { config: { url: 'mqtt://unused:1883' } })!;
        designer.addNode('mqtt-out', { x: 300, y: 120 }, {
            config: { mqtt: used.id, topic: 'sensors/temp' }
        });

        const component = panel();
        const items = component.groups[0].items;
        const usedItem = items.find(item => item.id === used.id)!;
        const unusedItem = items.find(item => item.id === unused.id)!;

        expect(component.usageLabel(usedItem)).toBe('{count} refs');
        expect(component.usageLabel(unusedItem)).toBe('unused');
        expect(component.usageClass(usedItem)).toContain('is-used');
        expect(component.usageClass(unusedItem)).toContain('is-unused');
    });

    it('reports edit, create and reveal requests to the host', () => {
        const broker = designer.addNode('mqtt', { x: 80, y: 80 }, { config: { url: 'mqtt://prod:1883' } })!;
        const events: Array<[string, string]> = [];
        const component = panel();
        component.action = (name, value) => events.push([String(name), value]);

        component.open();
        expect(component.visible).toBe(true);

        component.edit(broker.id);
        component.add('tls');
        component.reveal(broker.id);

        expect(events).toEqual([
            ['edit', broker.id],
            ['add', 'tls'],
            ['reveal', broker.id]
        ]);
        // Revealing drops the overlay so the canvas is visible again.
        expect(component.visible).toBe(false);
    });

    it('lists websocket listeners and exposes them to websocket nodes', () => {
        const listener = designer.addNode('websocket', { x: 80, y: 80 }, {
            name: 'hub', config: { host: '127.0.0.1', port: 8080, path: '/ws' }
        })!;
        const input = designer.addNode('websocket-in', { x: 300, y: 120 }, {
            config: { websocket: listener.id }
        })!;

        const group = panel().groups.find(entry => entry.resource === 'websocket-listener')!;
        expect(group.type).toBe('websocket');
        expect(group.items.map(item => item.id)).toEqual([listener.id]);
        expect(group.items[0].usedBy.length).toBe(1);
        const signature = configNodesSignature(designer.definition, registry, input.type);
        expect(signature).toContain('hub');
    });

    it('keeps reference pickers in the inspector in sync with record edits', () => {
        const broker = designer.addNode('mqtt', { x: 80, y: 80 }, {
            name: 'prod', config: { url: 'mqtt://prod:1883' }
        })!;
        const out = designer.addNode('mqtt-out', { x: 300, y: 120 }, {
            config: { mqtt: broker.id, topic: 'sensors/temp' }
        })!;

        const before = configNodesSignature(designer.definition, registry, out.type);
        expect(before).toContain('prod');

        designer.updateNode(broker.id, { name: 'prod-2', config: { url: 'mqtt://prod-2:1883' } });
        const after = configNodesSignature(designer.definition, registry, out.type);
        expect(after).not.toBe(before);
        expect(after).toContain('prod-2');

        // Nodes without reference fields must not invalidate their cached model.
        expect(configNodesSignature(designer.definition, registry, 'task')).toBe('');
    });
});
