import expect = require('expect');
import { createInjector } from '@tsdi/ioc';
import { WorkflowNodeRegistry } from '../src/visual/node-registry';
import { VisualWorkflowService } from '../src/visual/VisualWorkflowService';
import { VisualWorkflowDefinition } from '../src/visual/types';
import { WorkflowPluginRegistry } from '../src/plugins/plugin-registry';
import { WorkflowServiceRegistry } from '../src/plugins/service-registry';
import { WorkflowPlugin } from '../src/plugins/types';
import { createBuiltInWorkflowPlugin, listBuiltInWorkflowPlugins } from '../src/plugins/catalog';
import { createFilePlugin } from '../src/plugins/builtins/file';
import { createExecPlugin } from '../src/plugins/builtins/exec';
import { createTcpPlugin } from '../src/plugins/builtins/tcp';
import { createUdpPlugin } from '../src/plugins/builtins/udp';
import { createWebSocketPlugin } from '../src/plugins/builtins/websocket';
import * as net from 'node:net';
import * as dgram from 'node:dgram';
import { WebSocketServer } from 'ws';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

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
        expect(manifests.map(item => item.id).sort()).toEqual(['coap', 'exec', 'file', 'mqtt', 'nats', 'redis', 'tcp', 'udp', 'websocket']);
        expect(manifests.every(item => item.nodes.length > 0)).toBe(true);
        expect(JSON.stringify(manifests)).not.toContain('execute');
        expect(createBuiltInWorkflowPlugin('mqtt')?.nodes?.map(node => node.type)).toContain('mqtt-publish');
        expect(createBuiltInWorkflowPlugin('redis')?.nodes?.map(node => node.type)).toContain('redis-command');
        expect(createBuiltInWorkflowPlugin('nats')?.nodes?.map(node => node.type)).toContain('nats-request');
        expect(createBuiltInWorkflowPlugin('coap')?.nodes?.map(node => node.type)).toContain('coap-request');
        expect(createBuiltInWorkflowPlugin('tcp')?.nodes?.map(node => node.type)).toContain('tcp-request');
        expect(createBuiltInWorkflowPlugin('udp')?.nodes?.map(node => node.type)).toContain('udp-request');
        expect(createBuiltInWorkflowPlugin('websocket')?.nodes?.map(node => node.type)).toContain('websocket-request');
        expect(createBuiltInWorkflowPlugin('file')?.nodes?.map(node => node.type)).toContain('file-read');
        expect(createBuiltInWorkflowPlugin('missing')).toBeUndefined();
    });

    it('reads and writes files with the file plugin', async () => {
        const plugin = createFilePlugin();
        const write = plugin.nodes!.find(node => node.type === 'file-write')!;
        const read = plugin.nodes!.find(node => node.type === 'file-read')!;
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdi-file-plugin-'));
        const file = path.join(dir, 'demo.txt');

        const written = await write.execute!({ id: 'write_1', type: 'file-write', config: { path: file, content: 'hello' } } as any, {});
        expect(written.success).toBe(true);
        const readResult = await read.execute!({ id: 'read_1', type: 'file-read', config: { path: file } } as any, {});
        expect(readResult.success).toBe(true);
        expect(readResult.data?.content).toBe('hello');
        fs.rmSync(dir, { recursive: true, force: true });
    });

    it('runs TCP, UDP and WebSocket request plugins', async () => {
        const tcpServer = net.createServer(socket => {
            socket.on('data', data => socket.end(`echo:${data.toString()}`));
        });
        await new Promise<void>(resolve => tcpServer.listen(0, '127.0.0.1', () => resolve()));
        const tcpPort = (tcpServer.address() as net.AddressInfo).port;
        try {
            const tcp = createTcpPlugin().nodes!.find(node => node.type === 'tcp-request')!;
            const tcpResult = await tcp.execute!({ id: 'tcp_1', type: 'tcp-request', config: { host: '127.0.0.1', port: tcpPort, payload: 'hi', waitForReply: true, timeout: 2000 } } as any, {});
            expect(tcpResult.success).toBe(true);
            expect(tcpResult.data?.reply).toBe('echo:hi');
        } finally {
            tcpServer.close();
        }

        const udpServer = dgram.createSocket('udp4');
        udpServer.on('message', (message, remote) => {
            udpServer.send(`echo:${message.toString()}`, remote.port, remote.address);
        });
        await new Promise<void>(resolve => udpServer.bind(0, '127.0.0.1', () => resolve()));
        const udpPort = (udpServer.address() as any).port;
        try {
            const udp = createUdpPlugin().nodes!.find(node => node.type === 'udp-request')!;
            const udpResult = await udp.execute!({ id: 'udp_1', type: 'udp-request', config: { host: '127.0.0.1', port: udpPort, payload: 'hi', waitForReply: true, timeout: 2000 } } as any, {});
            expect(udpResult.success).toBe(true);
            expect(udpResult.data?.reply).toBe('echo:hi');
        } finally {
            udpServer.close();
        }

        const wsServer = new WebSocketServer({ host: '127.0.0.1', port: 0 });
        await new Promise<void>(resolve => wsServer.once('listening', () => resolve()));
        const wsPort = (wsServer.address() as any).port;
        wsServer.on('connection', socket => {
            socket.on('message', message => socket.send(`echo:${message.toString()}`));
        });
        try {
            const websocket = createWebSocketPlugin().nodes!.find(node => node.type === 'websocket-request')!;
            const wsResult = await websocket.execute!({ id: 'ws_1', type: 'websocket-request', config: { url: `ws://127.0.0.1:${wsPort}`, message: 'hi', waitForReply: true, timeout: 2000 } } as any, {});
            expect(wsResult.success).toBe(true);
            expect(wsResult.data?.reply).toBe('echo:hi');
        } finally {
            await new Promise<void>(resolve => wsServer.close(() => resolve()));
        }
    });

    it('runs host commands with the exec plugin', async () => {
        const plugin = createExecPlugin();
        const node = plugin.nodes!.find(item => item.type === 'exec')!;
        const result = await node.execute!({
            id: 'exec_1',
            type: 'exec',
            config: {
                command: process.execPath,
                args: [{ value: '-e' }, { value: 'process.stdout.write("exec-ok")' }],
                timeout: 10000,
                output: 'stdout'
            }
        } as any, {});
        expect(result.success).toBe(true);
        expect(result.data?.stdout).toBe('exec-ok');
        expect(result.data?.code).toBe(0);

        const failing = await node.execute!({
            id: 'exec_2',
            type: 'exec',
            config: {
                command: process.execPath,
                args: ['-e', 'process.stderr.write("boom"); process.exit(2)'],
                timeout: 10000
            }
        } as any, {});
        expect(failing.success).toBe(false);
        expect(failing.error?.message).toContain('code 2');
        expect(failing.data?.stderr).toContain('boom');
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
