import expect = require('expect');
import { createInjector, InjectUtil } from '@tsdi/ioc';
import { WorkflowModule } from '../src/workflow.module';
import { WorkflowNodeRegistry } from '../src/visual/node-registry';
import { WorkflowDesigner } from '../src/visual/workflow-designer';
import { VisualWorkflowService } from '../src/visual/VisualWorkflowService';
import {
    configNodeInfos,
    configNodeOptions,
    configNodeTypeForResource,
    listConfigNodes,
    nextConfigNodeId,
    referencesTo,
    unusedConfigNodes
} from '../src/visual/workflow-config-nodes';
import { buildWorkflowInspectorModel } from '../src/visual/workflow-view-models';
import { validateWorkflowConfigs } from '../src/visual/workflow-config-validation';

describe('Workflow configuration nodes', () => {
    let registry: WorkflowNodeRegistry;
    let designer: WorkflowDesigner;

    beforeEach(() => {
        const injector = createInjector();
        InjectUtil.use(injector, WorkflowModule);
        registry = injector.get(WorkflowNodeRegistry);
        designer = new WorkflowDesigner({ registry, service: injector.get(VisualWorkflowService) });
    });

    function addBroker(config: Record<string, any> = {}, name = 'prod broker') {
        const broker = designer.addNode('mqtt', { x: 80, y: 80 }, { name, config });
        expect(broker).toBeTruthy();
        return broker!;
    }

    it('marks mqtt and tls as configuration nodes with a resource', () => {
        expect(registry.get('mqtt')?.configNode).toBe(true);
        expect(registry.get('mqtt')?.resource).toBe('mqtt-broker');
        expect(registry.get('tls')?.configNode).toBe(true);
        expect(registry.get('tls')?.resource).toBe('tls');
        expect(configNodeTypeForResource(registry, 'mqtt-broker')).toBe('mqtt');
        expect(configNodeTypeForResource(registry, 'tls')).toBe('tls');
        expect(configNodeTypeForResource(registry, 'nope')).toBeUndefined();
    });

    it('lists config nodes and counts references', () => {
        const broker = addBroker({ url: 'mqtt://broker:1883' });
        const out = designer.addNode('mqtt-out', { x: 300, y: 120 }, {
            config: { mqtt: broker.id, topic: 'sensors/temp' }
        })!;
        const unusedBroker = addBroker({ url: 'mqtt://unused:1883' }, 'unused');

        expect(listConfigNodes(designer.definition, registry).map(node => node.id))
            .toEqual([broker.id, unusedBroker.id]);
        expect(listConfigNodes(designer.definition, registry, 'tls')).toEqual([]);

        const infos = configNodeInfos(designer.definition, registry);
        const used = infos.find(info => info.id === broker.id)!;
        expect(used.name).toBe('prod broker');
        expect(used.summary).toBe('mqtt://broker:1883');
        expect(used.usedBy).toEqual([out.id]);
        expect(used.used).toBe(true);
        expect(infos.find(info => info.id === unusedBroker.id)!.used).toBe(false);
        expect(unusedConfigNodes(designer.definition, registry).map(info => info.id))
            .toEqual([unusedBroker.id]);
        expect(referencesTo(designer.definition, registry, broker.id)).toEqual([out.id]);
    });

    it('builds unique ids per config-node type', () => {
        addBroker();
        addBroker();
        expect(nextConfigNodeId(designer.definition, 'mqtt')).toBe('mqtt_3');
        expect(nextConfigNodeId(designer.definition, 'tls')).toBe('tls_1');
    });

    it('exposes broker options with a summary description', () => {
        const broker = addBroker({ url: 'mqtt://prod:1883' }, 'prod');
        expect(configNodeOptions(designer.definition, registry, 'mqtt-broker')).toEqual([
            { label: 'prod', value: broker.id, description: 'mqtt://prod:1883' }
        ]);
    });

    it('renders the broker field as a picker with create and edit actions', () => {
        const broker = addBroker({ url: 'mqtt://prod:1883' }, 'prod');
        const out = designer.addNode('mqtt-out', { x: 300, y: 120 }, {
            config: { mqtt: broker.id, topic: 'sensors/temp' }
        })!;
        designer.selectNode(out.id);
        const model = buildWorkflowInspectorModel(designer, registry, 'en');
        const field = model.fields.find(item => item.key === 'mqtt')!;
        expect(field.type).toBe('select');
        expect(field.options.map(option => option.value)).toEqual(['', broker.id]);
        expect(field.options.find(option => option.value === broker.id)?.description)
            .toBe('mqtt://prod:1883');
        expect(field.actions?.map(action => action.id)).toEqual(['create', 'edit']);
        expect(field.reference?.missing).toBe(false);
        expect(field.reference?.label).toBe('prod');
    });

    it('keeps a stale broker id visible and flags it as missing', () => {
        const out = designer.addNode('mqtt-out', { x: 300, y: 120 }, {
            config: { mqtt: 'mqtt_9', topic: 'sensors/temp' }
        })!;
        designer.selectNode(out.id);
        const model = buildWorkflowInspectorModel(designer, registry, 'en');
        const field = model.fields.find(item => item.key === 'mqtt')!;
        expect(field.reference?.missing).toBe(true);
        const stale = field.options.find(option => option.value === 'mqtt_9')!;
        expect(stale.label).toContain('mqtt_9');
        expect(stale.label).toContain('missing');
        // A stale id has nothing to edit, so only "create" is offered.
        expect(field.actions?.map(action => action.id)).toEqual(['create']);
    });

    it('creates a broker and binds it in a single undo step', () => {
        const out = designer.addNode('mqtt-out', { x: 300, y: 120 }, {
            config: { topic: 'sensors/temp' }
        })!;
        const before = designer.nodes.length;
        const created = designer.createConfigNode('mqtt', { x: 80, y: 80 }, {
            name: 'prod',
            config: { url: 'mqtt://prod:1883' },
            bindTo: { nodeId: out.id, key: 'mqtt' }
        })!;
        expect(created.id).toBe('mqtt_1');
        expect(designer.nodes.length).toBe(before + 1);
        expect(designer.nodes.find(node => node.id === out.id)?.config?.mqtt).toBe(created.id);
        expect(designer.selection.nodeId).toBe(out.id);

        expect(designer.undo()).toBe(true);
        expect(designer.nodes.length).toBe(before);
        expect(designer.nodes.find(node => node.id === out.id)?.config?.mqtt).toBeUndefined();
    });

    it('reports missing references during config validation', () => {
        const out = designer.addNode('mqtt-out', { x: 300, y: 120 }, {
            config: { mqtt: 'mqtt_9', topic: 'sensors/temp' }
        })!;
        const issues = validateWorkflowConfigs(designer.definition, registry);
        const issue = issues.find(item => item.nodeId === out.id && item.fieldKey === 'mqtt')!;
        expect(issue).toBeTruthy();
        expect(issue.message).toContain('mqtt_9');
        expect(issue.message).toContain('Pick an existing');

        const broker = addBroker({ url: 'mqtt://prod:1883' });
        designer.updateNodeConfig(out.id, { mqtt: broker.id });
        expect(validateWorkflowConfigs(designer.definition, registry)
            .some(item => item.nodeId === out.id && item.fieldKey === 'mqtt')).toBe(false);
    });

    it('rejects a reference to the wrong resource', () => {
        const tls = designer.addNode('tls', { x: 80, y: 80 }, { config: { servername: 'prod' } })!;
        const out = designer.addNode('mqtt-out', { x: 300, y: 120 }, {
            config: { mqtt: tls.id, topic: 'sensors/temp' }
        })!;
        const issues = validateWorkflowConfigs(designer.definition, registry);
        const issue = issues.find(item => item.nodeId === out.id && item.fieldKey === 'mqtt')!;
        expect(issue).toBeTruthy();
        expect(issue.message).toContain(tls.id);
    });

    it('refreshes picker labels when the broker is renamed', () => {
        const broker = addBroker({ url: 'mqtt://prod:1883' }, 'prod');
        const out = designer.addNode('mqtt-out', { x: 300, y: 120 }, {
            config: { mqtt: broker.id, topic: 'sensors/temp' }
        })!;
        designer.selectNode(out.id);
        let field = buildWorkflowInspectorModel(designer, registry, 'en').fields
            .find(item => item.key === 'mqtt')!;
        expect(field.options.find(option => option.value === broker.id)?.label).toBe('prod');

        designer.updateNode(broker.id, { name: 'prod-2', config: { ...broker.config, url: 'mqtt://prod-2:1883' } });
        field = buildWorkflowInspectorModel(designer, registry, 'en').fields
            .find(item => item.key === 'mqtt')!;
        const option = field.options.find(item => item.value === broker.id)!;
        expect(option.label).toBe('prod-2');
        expect(option.description).toBe('mqtt://prod-2:1883');
        expect(field.reference?.label).toBe('prod-2');
    });

    it('reports which nodes reference a config node before deletion', () => {
        const broker = addBroker();
        const out = designer.addNode('mqtt-out', { x: 300, y: 120 }, {
            config: { mqtt: broker.id, topic: 'sensors/temp' }
        })!;
        const input = designer.addNode('mqtt-in', { x: 300, y: 260 }, {
            config: { mqtt: broker.id, topic: 'sensors/#' }
        })!;
        expect(designer.nodeReferences(broker.id).sort()).toEqual([out.id, input.id].sort());
        expect(designer.nodeReferences(out.id)).toEqual([]);
    });
});
