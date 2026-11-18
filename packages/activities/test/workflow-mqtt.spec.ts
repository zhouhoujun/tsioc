import expect = require('expect');
import * as net from 'node:net';
import { createInjector, Injector, InjectUtil } from '@tsdi/ioc';
import { WorkflowModule } from '../src/workflow.module';
import { WorkflowNodeRegistry } from '../src/visual/node-registry';
import { VisualWorkflowService } from '../src/visual/VisualWorkflowService';
import {
    connectPacket,
    decodePublish,
    decodeVarint,
    encodeVarint,
    mqttTopicMatches,
    parseMqttUrl,
    publishPacket,
    WorkflowMqttClient
} from '../server/WorkflowMqtt';
import { WorkflowInboundRunner } from '../server/WorkflowInboundRunner';

function withTimeout<T>(promise: Promise<T>, timeoutMs = 4000): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('mqtt test timed out')), timeoutMs);
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

function frame(header: number, ...parts: Buffer[]): Buffer {
    const body = Buffer.concat(parts);
    return Buffer.concat([Buffer.from([header]), encodeVarint(body.length), body]);
}

interface FakeBroker {
    url: string;
    port: number;
    publishes: Array<{ topic: string; payload: string }>;
    subscriptions: string[];
    send(topic: string, payload: string): void;
    close(): Promise<void>;
}

/** Tiny MQTT 3.1.1 broker good enough for CONNECT/SUBSCRIBE/PUBLISH tests. */
async function startBroker(): Promise<FakeBroker> {
    const publishes: Array<{ topic: string; payload: string }> = [];
    const subscriptions: string[] = [];
    const sockets = new Set<net.Socket>();
    const server = net.createServer(socket => {
        sockets.add(socket);
        socket.on('close', () => sockets.delete(socket));
        socket.on('error', () => sockets.delete(socket));
        let buffer = Buffer.alloc(0);
        socket.on('data', chunk => {
            buffer = buffer.length ? Buffer.concat([buffer, chunk]) : chunk;
            for (; ;) {
                if (buffer.length < 2) {
                    return;
                }
                const length = decodeVarint(buffer, 1);
                if (!length.bytes) {
                    return;
                }
                const total = 1 + length.bytes + length.value;
                if (buffer.length < total) {
                    return;
                }
                const packet = buffer.slice(0, total);
                buffer = buffer.slice(total);
                const type = (packet[0] >> 4) & 0x0f;
                const start = 1 + length.bytes;
                if (type === 1) { // CONNECT
                    socket.write(Buffer.from([0x20, 0x02, 0x00, 0x00]));
                } else if (type === 8) { // SUBSCRIBE
                    const packetId = packet.readUInt16BE(start);
                    const topicLength = packet.readUInt16BE(start + 2);
                    subscriptions.push(packet.slice(start + 4, start + 4 + topicLength).toString('utf8'));
                    socket.write(frame(0x90, Buffer.from([
                        (packetId >> 8) & 0xff, packetId & 0xff, 0x01
                    ])));
                } else if (type === 3) { // PUBLISH
                    const message = decodePublish(packet);
                    publishes.push({ topic: message.topic, payload: message.payload });
                    if (message.qos > 0 && message.packetId) {
                        socket.write(frame(0x40, Buffer.from([
                            (message.packetId >> 8) & 0xff, message.packetId & 0xff
                        ])));
                    }
                }
            }
        });
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as net.AddressInfo).port;
    return {
        url: `mqtt://127.0.0.1:${port}`,
        port,
        publishes,
        subscriptions,
        send(topic: string, payload: string) {
            const body = Buffer.concat([Buffer.from(topic, 'utf8').length ? Buffer.from([
                (Buffer.byteLength(topic) >> 8) & 0xff, Buffer.byteLength(topic) & 0xff
            ]) : Buffer.alloc(0), Buffer.from(topic, 'utf8'), Buffer.from(payload, 'utf8')]);
            const packet = frame(0x30, body);
            sockets.forEach(socket => {
                if (!socket.destroyed) {
                    socket.write(packet);
                }
            });
        },
        close: async () => {
            sockets.forEach(socket => socket.destroy());
            await new Promise<void>(resolve => server.close(() => resolve()));
        }
    };
}

describe('Workflow MQTT transport', () => {
    it('parses broker urls, encodes packets and matches topics', () => {
        expect(parseMqttUrl('mqtt://broker:1883')).toEqual({ secure: false, host: 'broker', port: 1883 });
        expect(parseMqttUrl('mqtts://broker')).toEqual({ secure: true, host: 'broker', port: 8883 });
        expect(parseMqttUrl('mqtt://user:pass@broker:1884').port).toBe(1884);
        expect(() => parseMqttUrl('http://broker')).toThrow(/Invalid MQTT URL/);

        const encoded = encodeVarint(321);
        expect(decodeVarint(encoded).value).toBe(321);

        const connect = connectPacket({ url: 'mqtt://x', clientId: 'c1', username: 'u', password: 'p' });
        expect(connect[0]).toBe(0x10);
        expect(connect.includes(Buffer.from('MQTT'))).toBe(true);

        const publish = publishPacket({ topic: 'a/b', payload: 'hello', qos: 1 }, 7);
        const decoded = decodePublish(publish);
        expect(decoded.topic).toBe('a/b');
        expect(decoded.payload).toBe('hello');
        expect(decoded.qos).toBe(1);
        expect(decoded.packetId).toBe(7);

        expect(mqttTopicMatches('sensors/+/temp', 'sensors/a/temp')).toBe(true);
        expect(mqttTopicMatches('sensors/#', 'sensors/a/b/temp')).toBe(true);
        expect(mqttTopicMatches('sensors/+/temp', 'sensors/a/humidity')).toBe(false);
        expect(mqttTopicMatches('sensors/temp', 'sensors/temp')).toBe(true);
    });

    it('subscribes, receives and publishes against a broker', async () => {
        const broker = await startBroker();
        const client = new WorkflowMqttClient({ url: broker.url, clientId: 'test-client', keepalive: 0 });
        try {
            const received: Array<{ topic: string; payload: string }> = [];
            await client.subscribe('sensors/+/temp', 1, message => received.push({
                topic: message.topic,
                payload: message.payload
            }));
            expect(broker.subscriptions).toEqual(['sensors/+/temp']);

            broker.send('sensors/kitchen/temp', '21.5');
            await withTimeout(new Promise<void>(resolve => {
                const tick = () => received.length >= 1 ? resolve() : setTimeout(tick, 10);
                tick();
            }));
            expect(received).toEqual([{ topic: 'sensors/kitchen/temp', payload: '21.5' }]);

            await client.publish({ topic: 'out/topic', payload: '{"ok":true}', qos: 1 });
            expect(broker.publishes).toContainEqual({ topic: 'out/topic', payload: '{"ok":true}' });
        } finally {
            client.close();
            await broker.close();
        }
    });

    it('runs a workflow for every MQTT message through the inbound runner', async () => {
        const broker = await startBroker();
        const injector: Injector = createInjector();
        InjectUtil.use(injector, WorkflowModule);
        const registry = injector.get(WorkflowNodeRegistry);
        const service = injector.get(VisualWorkflowService);
        const runner = new WorkflowInboundRunner(service);
        const seen: any[] = [];
        const handle = await runner.start({
            id: 'mqtt-workflow',
            name: 'MQTT workflow',
            nodes: [
                registry.createNode('mqtt-in', { x: 0, y: 0 }, {
                    id: 'mqtt_in',
                    config: { url: broker.url, topic: 'sensors/#', qos: '0' }
                }),
                registry.createNode('task', { x: 200, y: 0 }, {
                    id: 'mqtt_task',
                    config: { action: 'capture' }
                })
            ],
            connections: [{
                id: 'c1',
                sourceNodeId: 'mqtt_in',
                sourcePort: 'out',
                targetNodeId: 'mqtt_task',
                targetPort: 'in'
            }]
        }, {
            context: {
                actions: {
                    capture: (ctx: any) => {
                        seen.push({ topic: ctx.topic, payload: ctx.payload });
                        return ctx.payload;
                    }
                }
            }
        });
        try {
            broker.send('sensors/room/temp', '{"value":22}');
            await withTimeout(new Promise<void>(resolve => {
                const tick = () => seen.length >= 1 ? resolve() : setTimeout(tick, 10);
                tick();
            }));
            expect(seen[0].topic).toBe('sensors/room/temp');
            expect(seen[0].payload).toEqual({ value: 22 });
        } finally {
            await handle.stop();
            await broker.close();
        }
        expect(handle.running).toBe(false);
    });

    it('publishes from mqtt-out through the host transport', async () => {
        const broker = await startBroker();
        const injector: Injector = createInjector();
        InjectUtil.use(injector, WorkflowModule);
        const registry = injector.get(WorkflowNodeRegistry);
        const service = injector.get(VisualWorkflowService);
        const published: any[] = [];
        service.setMqttPublisher(message => {
            published.push(message);
        });
        try {
            const definition = {
                id: 'mqtt-out-flow',
                name: 'MQTT out flow',
                nodes: [registry.createNode('mqtt-out', { x: 0, y: 0 }, {
                    id: 'mqtt_out',
                    config: {
                        url: broker.url,
                        topic: 'sensors/out',
                        payload: 'payload',
                        qos: '1',
                        retain: true,
                        username: '{{credential:broker-user}}',
                        password: '{{credential:broker-pass}}'
                    }
                })],
                connections: []
            };
            service.setCredentialResolver(name => ({
                'broker-user': 'user-1',
                'broker-pass': 'secret-1'
            } as Record<string, string>)[name]);
            const result = await service.execute(definition, { payload: { value: 42 } });
            expect(result.success).toBe(true);
            expect(published.length).toBe(1);
            expect(published[0]).toMatchObject({
                url: broker.url,
                topic: 'sensors/out',
                payload: '{"value":42}',
                qos: 1,
                retain: true,
                username: 'user-1',
                password: 'secret-1'
            });
        } finally {
            await broker.close();
        }
    });

    it('passes a resolved TLS config node to the MQTT transport', async () => {
        const injector: Injector = createInjector();
        InjectUtil.use(injector, WorkflowModule);
        const registry = injector.get(WorkflowNodeRegistry);
        const service = injector.get(VisualWorkflowService);
        const published: any[] = [];
        service.setMqttPublisher(message => {
            published.push(message);
        });
        service.setCredentialResolver(name => name === 'mqtt-ca' ? 'CA-PEM' : undefined);
        const tlsNode = registry.createNode('tls', { x: 0, y: 0 }, {
            id: 'tls_1',
            config: { ca: '{{credential:mqtt-ca}}', servername: 'mqtt.example.com', rejectUnauthorized: false }
        });
        const outNode = registry.createNode('mqtt-out', { x: 200, y: 0 }, {
            id: 'mqtt_out',
            config: { url: 'mqtts://mqtt.example.com:8883', topic: 'a/b', payload: 'payload', tls: 'tls_1' }
        });
        const result = await service.execute({
            id: 'mqtt-tls',
            name: 'MQTT TLS',
            nodes: [tlsNode, outNode],
            connections: []
        }, { payload: 'x' });
        expect(result.success).toBe(true);
        expect(published[0].tls).toEqual({
            ca: 'CA-PEM',
            cert: undefined,
            key: undefined,
            servername: 'mqtt.example.com',
            rejectUnauthorized: false
        });
    });

    it('reports a clear error when the host has no MQTT transport', async () => {
        const injector: Injector = createInjector();
        InjectUtil.use(injector, WorkflowModule);
        const registry = injector.get(WorkflowNodeRegistry);
        const service = injector.get(VisualWorkflowService);
        const result = await service.execute({
            id: 'mqtt-no-host',
            name: 'MQTT no host',
            nodes: [registry.createNode('mqtt-out', { x: 0, y: 0 }, {
                id: 'mqtt_out',
                config: { url: 'mqtt://127.0.0.1:1883', topic: 'a/b' }
            })],
            connections: []
        }, { payload: 'x' });
        expect(result.success).toBe(false);
        expect(String(result.error?.message || '')).toContain('requires a workflow host');
    });
});
