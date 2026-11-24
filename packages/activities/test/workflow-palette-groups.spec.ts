import expect = require('expect');
import { WorkflowNodeRegistry } from '../src/visual/node-registry';
import { workflowNodeProtocol } from '../src/visual/workflow-palette-groups';

describe('Workflow palette protocol grouping', () => {
    let registry: WorkflowNodeRegistry;

    beforeEach(() => {
        registry = new WorkflowNodeRegistry();
    });

    it('collects each protocol in its own group', () => {
        const groups = registry.palette('en');
        const byProtocol = new Map(groups.filter(group => group.protocol).map(group => [group.protocol!, group]));

        expect(Array.from(byProtocol.keys())).toEqual(['http', 'websocket', 'tcp', 'udp', 'mqtt', 'tls']);
        expect(byProtocol.get('http')!.label).toBe('HTTP');
        expect(byProtocol.get('http')!.items.map(item => item.type).sort()).toEqual(
            ['http', 'http-in', 'http-request', 'http-response'].sort()
        );
        expect(byProtocol.get('websocket')!.label).toBe('WebSocket');
        expect(byProtocol.get('websocket')!.items.map(item => item.type).sort()).toEqual(
            ['websocket', 'websocket-client', 'websocket-in', 'websocket-out'].sort()
        );
        expect(byProtocol.get('mqtt')!.items.map(item => item.type).sort()).toEqual(
            ['mqtt', 'mqtt-in', 'mqtt-out'].sort()
        );
        expect(byProtocol.get('tls')!.items.map(item => item.type)).toEqual(['tls']);

        const triggers = groups.find(group => group.id === 'trigger')!;
        expect(triggers.items.map(item => item.type)).toContain('start');
        expect(triggers.items.map(item => item.type)).not.toContain('http-in');
        expect(triggers.items.map(item => item.type)).not.toContain('mqtt-in');
    });

    it('keeps every registered component exactly once across the groups', () => {
        const groups = registry.palette('en');
        const types = groups.flatMap(group => group.items.map(item => item.type));

        expect(types.length).toBe(registry.list().length);
        expect(new Set(types).size).toBe(types.length);
        expect(types).toContain('log');
        expect(types).toContain('task');
    });

    it('infers protocols from plugin-style type prefixes and honours overrides', () => {
        registry.register({
            type: 'coap-request',
            label: 'CoAP request',
            description: 'CoAP request',
            category: 'action',
            icon: 'C',
            color: '#000000',
            inputs: [],
            outputs: []
        } as any);
        registry.register({
            type: 'amqp-publish',
            label: 'AMQP publish',
            description: 'AMQP publish',
            category: 'action',
            protocol: 'amqp',
            icon: 'A',
            color: '#000000',
            inputs: [],
            outputs: []
        } as any);

        const groups = registry.palette('en');
        expect(groups.find(group => group.protocol === 'coap')!.id).toBe('protocol-coap');
        expect(groups.find(group => group.protocol === 'coap')!.label).toBe('CoAP');
        expect(groups.find(group => group.protocol === 'amqp')!.label).toBe('Amqp');
        expect(groups.find(group => group.protocol === 'amqp')!.items.map(item => item.type)).toEqual(['amqp-publish']);
        expect(workflowNodeProtocol('mqtt-out')).toBe('mqtt');
        expect(workflowNodeProtocol('custom', 'custom-protocol')).toBe('custom-protocol');
    });

    it('keeps protocol ids stable across locales', () => {
        const groups = registry.palette('zh-CN');
        expect(groups.find(group => group.protocol === 'http')!.label).toBe('HTTP');
        expect(groups.find(group => group.protocol === 'http')!.id).toBe('protocol-http');
    });
});
