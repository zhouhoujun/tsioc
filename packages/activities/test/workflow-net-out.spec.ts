import expect = require('expect');
import * as dgram from 'node:dgram';
import * as net from 'node:net';
import { WebSocketServer } from 'ws';
import { createInjector, Injector, InjectUtil } from '@tsdi/ioc';
import { WorkflowModule } from '../src/workflow.module';
import { WorkflowNodeRegistry } from '../src/visual/node-registry';
import { VisualWorkflowService } from '../src/visual/VisualWorkflowService';
import { VisualWorkflowDefinition } from '../src/visual/types';
import { WorkflowNetTransport } from '../server/WorkflowNetTransport';

function withTimeout<T>(promise: Promise<T>, timeoutMs = 5000): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('net out test timed out')), timeoutMs);
        promise.then(
            value => {
                clearTimeout(timer);
                resolve(value);
            },
            error => {
                clearTimeout(timer);
                reject(error);
            }
        );
    });
}

describe('Workflow outbound transports', () => {
    let injector: Injector;
    let registry: WorkflowNodeRegistry;
    let service: VisualWorkflowService;
    let transport: WorkflowNetTransport;

    beforeEach(() => {
        injector = createInjector();
        InjectUtil.use(injector, WorkflowModule);
        registry = injector.get(WorkflowNodeRegistry);
        service = injector.get(VisualWorkflowService);
        transport = new WorkflowNetTransport();
        service.setTcpSender(message => transport.sendTcp(message));
        service.setUdpSender(message => transport.sendUdp(message));
        service.setWebSocketSender(message => transport.sendWebSocket(message));
    });

    afterEach(() => {
        transport.onDestroy();
    });

    function definition(type: 'tcp-out' | 'udp-out' | 'websocket-out', config: Record<string, any>): VisualWorkflowDefinition {
        return {
            id: `${type}-flow`,
            name: `${type} flow`,
            nodes: [registry.createNode(type, { x: 0, y: 0 }, { id: `${type}_1`, config })],
            connections: []
        };
    }

    it('sends a TCP payload to a listening server', async () => {
        const received: string[] = [];
        const server = net.createServer(socket => {
            socket.on('data', chunk => {
                received.push(chunk.toString('utf8'));
                socket.end();
            });
        });
        await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()));
        const port = (server.address() as net.AddressInfo).port;
        try {
            const result = await service.execute(definition('tcp-out', {
                host: '127.0.0.1',
                port,
                payload: 'payload',
                timeout: 3000
            }), { payload: { value: 7 } });
            expect(result.success).toBe(true);
            expect(result.data?.executionState?.nodeStates['tcp-out_1']?.result?.data?.transport).toBe('tcp');
            await withTimeout(new Promise<void>(resolve => {
                const tick = () => received.length ? resolve() : setTimeout(tick, 10);
                tick();
            }));
            expect(received[0]).toBe('{"value":7}');
        } finally {
            await new Promise<void>(resolve => server.close(() => resolve()));
        }
    });

    it('sends a UDP datagram to a listening socket', async () => {
        const client = dgram.createSocket('udp4');
        const received: string[] = [];
        client.bind(0, '127.0.0.1', () => { /* bound */ });
        await withTimeout(new Promise<void>(resolve => client.once('listening', () => resolve())));
        client.on('message', message => received.push(message.toString('utf8')));
        const port = (client.address() as net.AddressInfo).port;
        try {
            const result = await service.execute(definition('udp-out', {
                host: '127.0.0.1',
                port,
                payload: 'payload'
            }), { payload: 'hello-udp' });
            expect(result.success).toBe(true);
            await withTimeout(new Promise<void>(resolve => {
                const tick = () => received.length ? resolve() : setTimeout(tick, 10);
                tick();
            }));
            expect(received[0]).toBe('hello-udp');
        } finally {
            client.close();
        }
    });

    it('sends a WebSocket message to a listening server', async () => {
        const server = new WebSocketServer({ host: '127.0.0.1', port: 0 });
        const received: string[] = [];
        server.on('connection', socket => {
            socket.on('message', (chunk: any) => {
                received.push(chunk.toString('utf8'));
                socket.close();
            });
        });
        await new Promise<void>(resolve => server.once('listening', () => resolve()));
        const port = (server.address() as net.AddressInfo).port;
        try {
            const result = await service.execute(definition('websocket-out', {
                url: `ws://127.0.0.1:${port}`,
                payload: 'payload',
                timeout: 3000
            }), { payload: { ok: true } });
            expect(result.success).toBe(true);
            await withTimeout(new Promise<void>(resolve => {
                const tick = () => received.length ? resolve() : setTimeout(tick, 10);
                tick();
            }));
            expect(received[0]).toBe('{"ok":true}');
        } finally {
            await new Promise<void>(resolve => server.close(() => resolve()));
        }
    });

    it('broadcasts through a shared WebSocket listener config', async () => {
        const requests: any[] = [];
        service.setWebSocketBroadcaster(message => {
            requests.push(message);
            return 3;
        });
        const listener = registry.createNode('websocket', { x: 0, y: 0 }, {
            id: 'websocket_1',
            config: { host: '127.0.0.1', port: 9099, path: '/ws' }
        });
        const outNode = registry.createNode('websocket-out', { x: 200, y: 0 }, {
            id: 'websocket_out_1',
            config: { websocket: 'websocket_1', payload: 'payload' }
        });
        const result = await service.execute({
            id: 'websocket-broadcast',
            name: 'WebSocket broadcast',
            nodes: [listener, outNode],
            connections: []
        }, { payload: { ok: true } });
        expect(result.success).toBe(true);
        expect(requests).toHaveLength(1);
        expect(requests[0]).toMatchObject({
            host: '127.0.0.1',
            port: 9099,
            path: '/ws',
            payload: '{"ok":true}'
        });
        expect((result.data as any).clients).toEqual(3);
    });

    it('resolves a TLS config node and its credential references', async () => {
        const sent: any[] = [];
        service.setTcpSender(message => {
            sent.push(message);
        });
        service.setCredentialResolver(name => ({
            'tls-ca': 'CA-PEM',
            'tls-key': 'KEY-PEM'
        } as Record<string, string>)[name]);
        const tlsNode = registry.createNode('tls', { x: 0, y: 0 }, {
            id: 'tls_1',
            config: {
                ca: '{{credential:tls-ca}}',
                key: '{{credential:tls-key}}',
                servername: 'broker.example.com',
                rejectUnauthorized: false
            }
        });
        const outNode = registry.createNode('tcp-out', { x: 200, y: 0 }, {
            id: 'tcp_out_1',
            config: { host: 'example.test', port: 9000, payload: 'payload', tls: 'tls_1' }
        });
        const result = await service.execute({
            id: 'tls-flow',
            name: 'TLS flow',
            nodes: [tlsNode, outNode],
            connections: []
        } as VisualWorkflowDefinition, { payload: 'secure' });
        expect(result.success).toBe(true);
        expect(sent.length).toBe(1);
        expect(sent[0].tls).toEqual({
            ca: 'CA-PEM',
            cert: undefined,
            key: 'KEY-PEM',
            servername: 'broker.example.com',
            rejectUnauthorized: false
        });
        // The config node itself never blocks the run.
        expect(result.data?.executionState?.nodeStates['tls_1']?.result?.data?.config).toBe(true);
    });

    it('reports missing TLS config and missing host transports', async () => {
        const broken = await service.execute(definition('tcp-out', {
            host: '127.0.0.1',
            port: 9,
            payload: 'payload',
            tls: 'missing_tls'
        }), { payload: 'x' });
        expect(broken.success).toBe(false);
        expect(String(broken.error?.message || '')).toContain('TLS config not found');

        const bare = createInjector();
        InjectUtil.use(bare, WorkflowModule);
        const bareService = bare.get(VisualWorkflowService);
        const bareRegistry = bare.get(WorkflowNodeRegistry);
        const noHost = await bareService.execute({
            id: 'no-host',
            name: 'No host',
            nodes: [bareRegistry.createNode('udp-out', { x: 0, y: 0 }, {
                id: 'udp_1',
                config: { host: '127.0.0.1', port: 9, payload: 'payload' }
            })],
            connections: []
        }, { payload: 'x' });
        expect(noHost.success).toBe(false);
        expect(String(noHost.error?.message || '')).toContain('requires a workflow host');
    });
});
