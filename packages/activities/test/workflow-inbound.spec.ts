import expect = require('expect');
import * as dgram from 'node:dgram';
import * as net from 'node:net';
import { WebSocket } from 'ws';
import { createInjector, Injector, InjectUtil } from '@tsdi/ioc';
import { WorkflowModule } from '../src/workflow.module';
import { WorkflowNodeRegistry } from '../src/visual/node-registry';
import { VisualWorkflowService } from '../src/visual/VisualWorkflowService';
import { WorkflowInboundRunner } from '../server/WorkflowInboundRunner';
import { WorkflowWebSocketRegistry } from '../server/WorkflowWebSocket';
import { VisualWorkflowDefinition } from '../src/visual/types';

function withTimeout<T>(promise: Promise<T>, timeoutMs = 4000): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('inbound test timed out')), timeoutMs);
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

describe('Workflow inbound runner', () => {
    let injector: Injector;
    let registry: WorkflowNodeRegistry;
    let service: VisualWorkflowService;
    let runner: WorkflowInboundRunner;

    beforeEach(() => {
        injector = createInjector();
        InjectUtil.use(injector, WorkflowModule);
        registry = injector.get(WorkflowNodeRegistry);
        service = injector.get(VisualWorkflowService);
        runner = new WorkflowInboundRunner(service);
    });

    function definition(type: 'tcp-in' | 'udp-in' | 'websocket-in'): VisualWorkflowDefinition {
        return {
            id: `${type}-workflow`,
            name: `${type} workflow`,
            nodes: [
                registry.createNode(type, { x: 0, y: 0 }, {
                    id: `${type}_1`,
                    config: { host: '127.0.0.1', port: 0, reply: true }
                }),
                registry.createNode('task', { x: 200, y: 0 }, {
                    id: 'echo_task',
                    config: { action: 'echo' }
                })
            ],
            connections: [{
                id: 'c1',
                sourceNodeId: `${type}_1`,
                sourcePort: 'out',
                targetNodeId: 'echo_task',
                targetPort: 'in'
            }]
        };
    }

    it('runs a workflow for every TCP message and replies with the result', async () => {
        const payloads: any[] = [];
        const handle = await runner.start(definition('tcp-in'), {
            context: {
                actions: {
                    echo: (ctx: any) => {
                        payloads.push(ctx.payload);
                        return { echo: ctx.payload };
                    }
                }
            }
        });
        try {
            expect(handle.ports.length).toBe(1);
            const port = handle.ports[0];
            const reply = await withTimeout(new Promise<string>((resolve, reject) => {
                const socket = net.connect(port, '127.0.0.1', () => socket.write('hello'));
                socket.setEncoding('utf8');
                socket.once('data', text => {
                    socket.end();
                    resolve(String(text));
                });
                socket.once('error', reject);
            }));
            expect(payloads).toEqual(['hello']);
            const parsed = JSON.parse(reply);
            expect(parsed.result.echo).toBe('hello');
        } finally {
            await handle.stop();
        }
        expect(handle.running).toBe(false);
    });

    it('answers every line-framed TCP message without closing the socket', async () => {
        const payloads: any[] = [];
        const framed = definition('tcp-in');
        framed.nodes[0].config = {
            host: '127.0.0.1',
            port: 0,
            reply: true,
            framing: 'line',
            separator: '\\n'
        };
        const handle = await runner.start(framed, {
            context: {
                actions: {
                    echo: (ctx: any) => {
                        payloads.push(ctx.payload);
                        return { echo: ctx.payload };
                    }
                }
            }
        });
        try {
            const port = handle.ports[0];
            const replies = await withTimeout(new Promise<string[]>((resolve, reject) => {
                const socket = net.connect(port, '127.0.0.1', () => socket.write('a\nb\n'));
                socket.setEncoding('utf8');
                let buffer = '';
                const lines: string[] = [];
                socket.on('data', text => {
                    buffer += String(text);
                    const parts = buffer.split('\n');
                    buffer = parts.pop() || '';
                    for (const part of parts) {
                        if (part) {
                            lines.push(part);
                        }
                    }
                    if (lines.length >= 2) {
                        socket.end();
                        resolve(lines);
                    }
                });
                socket.once('error', reject);
            }));
            expect(payloads).toEqual(['a', 'b']);
            expect(replies.length).toBe(2);
            expect(JSON.parse(replies[0]).result.echo).toBe('a');
            expect(JSON.parse(replies[1]).result.echo).toBe('b');
        } finally {
            await handle.stop();
        }
    });

    it('runs a TCP listener from a shared endpoint config', async () => {
        const sharedDefinition = definition('tcp-in');
        const inbound = sharedDefinition.nodes.find(node => node.type === 'tcp-in')!;
        inbound.config = { tcp: 'tcp_1', reply: true };
        sharedDefinition.nodes.unshift(registry.createNode('tcp', { x: -200, y: 0 }, {
            id: 'tcp_1',
            config: { host: '127.0.0.1', port: 0 }
        }));
        const payloads: any[] = [];
        const handle = await runner.start(sharedDefinition, {
            context: {
                actions: {
                    echo: (ctx: any) => {
                        payloads.push(ctx.payload);
                        return { echo: ctx.payload };
                    }
                }
            }
        });
        try {
            expect(handle.ports.length).toBe(1);
            const reply = await withTimeout(new Promise<string>((resolve, reject) => {
                const socket = net.connect(handle.ports[0], '127.0.0.1', () => socket.write('shared'));
                socket.setEncoding('utf8');
                socket.once('data', text => {
                    socket.end();
                    resolve(String(text));
                });
                socket.once('error', reject);
            }));
            expect(payloads).toEqual(['shared']);
            expect(JSON.parse(reply).result.echo).toBe('shared');
        } finally {
            await handle.stop();
        }
    });

    it('frames TCP input by line and flushes the trailing fragment', async () => {
        const payloads: any[] = [];
        const definition = {
            id: 'tcp-lines',
            name: 'TCP lines',
            nodes: [
                registry.createNode('tcp-in', { x: 0, y: 0 }, {
                    id: 'tcp_in',
                    config: { host: '127.0.0.1', port: 0, framing: 'line', separator: '\\n' }
                }),
                registry.createNode('task', { x: 200, y: 0 }, {
                    id: 'collect',
                    config: { action: 'collect' }
                })
            ],
            connections: [{
                id: 'c1',
                sourceNodeId: 'tcp_in',
                sourcePort: 'out',
                targetNodeId: 'collect',
                targetPort: 'in'
            }]
        } as VisualWorkflowDefinition;
        const handle = await runner.start(definition, {
            context: {
                actions: {
                    collect: (ctx: any) => {
                        payloads.push(ctx.payload);
                        return { ok: true };
                    }
                }
            }
        });
        try {
            const port = handle.ports[0];
            await withTimeout(new Promise<void>((resolve, reject) => {
                const socket = net.connect(port, '127.0.0.1', () => {
                    socket.write('one\ntwo\n');
                    // Incomplete line: only emitted when the socket closes.
                    socket.write('three');
                    socket.end();
                });
                socket.on('error', reject);
                socket.on('close', () => resolve());
            }));
            await withTimeout(new Promise<void>(resolve => {
                const started = Date.now();
                const poll = () => {
                    if (payloads.length >= 3 || Date.now() - started > 3000) {
                        resolve();
                        return;
                    }
                    setTimeout(poll, 20);
                };
                poll();
            }));
            expect(payloads).toEqual(['one', 'two', 'three']);
        } finally {
            await handle.stop();
        }
    });

    it('runs a workflow for every UDP datagram and replies with the result', async () => {
        const payloads: any[] = [];
        const handle = await runner.start(definition('udp-in'), {
            context: {
                actions: {
                    echo: (ctx: any) => {
                        payloads.push(ctx.payload);
                        return { echo: ctx.payload };
                    }
                }
            }
        });
        const client = dgram.createSocket('udp4');
        try {
            expect(handle.ports.length).toBe(1);
            const port = handle.ports[0];
            const reply = await withTimeout(new Promise<string>((resolve, reject) => {
                client.once('message', message => resolve(message.toString('utf8')));
                client.once('error', reject);
                client.send('{"count":2}', port, '127.0.0.1');
            }));
            expect(payloads).toEqual([{ count: 2 }]);
            const parsed = JSON.parse(reply);
            expect(parsed.result.echo).toEqual({ count: 2 });
        } finally {
            client.close();
            await handle.stop();
        }
        expect(handle.running).toBe(false);
    });

    it('runs a workflow for every WebSocket message and replies with the result', async () => {
        const payloads: any[] = [];
        const handle = await runner.start(definition('websocket-in'), {
            context: {
                actions: {
                    echo: (ctx: any) => {
                        payloads.push(ctx.payload);
                        return { echo: ctx.payload };
                    }
                }
            }
        });
        const client = new WebSocket(`ws://127.0.0.1:${handle.ports[0]}`);
        try {
            const reply = await withTimeout(new Promise<string>((resolve, reject) => {
                client.once('open', () => client.send('hello'));
                client.once('message', data => resolve(data.toString()));
                client.once('error', reject);
            }));
            expect(payloads).toEqual(['hello']);
            const parsed = JSON.parse(reply);
            expect(parsed.result.echo).toBe('hello');
        } finally {
            client.close();
            await handle.stop();
        }
        expect(handle.running).toBe(false);
    });

    it('shares one WebSocket listener between nodes that reference a config node', async () => {
        const seen: string[] = [];
        const definition: VisualWorkflowDefinition = {
            id: 'websocket-shared',
            name: 'WebSocket shared listener',
            nodes: [
                registry.createNode('websocket', { x: 0, y: 0 }, {
                    id: 'websocket_1',
                    config: { host: '127.0.0.1', port: 0, path: '/shared' }
                }),
                registry.createNode('websocket-in', { x: 0, y: 0 }, {
                    id: 'ws_a',
                    config: { websocket: 'websocket_1', reply: false }
                }),
                registry.createNode('websocket-in', { x: 0, y: 0 }, {
                    id: 'ws_b',
                    config: { websocket: 'websocket_1', reply: false }
                }),
                registry.createNode('task', { x: 0, y: 0 }, { id: 'echo_a', config: { action: 'echoA' } }),
                registry.createNode('task', { x: 0, y: 0 }, { id: 'echo_b', config: { action: 'echoB' } })
            ],
            connections: [
                { id: 'ca', sourceNodeId: 'ws_a', sourcePort: 'out', targetNodeId: 'echo_a', targetPort: 'in' },
                { id: 'cb', sourceNodeId: 'ws_b', sourcePort: 'out', targetNodeId: 'echo_b', targetPort: 'in' }
            ]
        };
        const handle = await runner.start(definition, {
            context: {
                actions: {
                    echoA: () => {
                        seen.push('a');
                        return { echo: 'a' };
                    },
                    echoB: () => {
                        seen.push('b');
                        return { echo: 'b' };
                    }
                }
            }
        });
        try {
            // One server for the shared listener, reported once per node.
            expect(handle.ports.length).toEqual(2);
            expect(handle.ports[0]).toEqual(handle.ports[1]);
            const client = new WebSocket(`ws://127.0.0.1:${handle.ports[0]}/shared`);
            try {
                await withTimeout(new Promise<void>((resolve, reject) => {
                    client.once('open', () => {
                        client.send('hello');
                        resolve();
                    });
                    client.once('error', reject);
                }));
                await withTimeout(new Promise<void>(resolve => {
                    const tick = () => seen.length >= 2 ? resolve() : setTimeout(tick, 10);
                    tick();
                }));
                expect(seen.sort()).toEqual(['a', 'b']);
            } finally {
                client.close();
            }
        } finally {
            await handle.stop();
        }
    });

    it('keeps a shared listener alive for websocket-out broadcasts', async () => {
        const definition: VisualWorkflowDefinition = {
            id: 'websocket-out-only',
            name: 'WebSocket out listener',
            nodes: [
                registry.createNode('websocket', { x: 0, y: 0 }, {
                    id: 'websocket_1',
                    config: { host: '127.0.0.1', port: 0, path: '/broadcast' }
                }),
                registry.createNode('websocket-out', { x: 200, y: 0 }, {
                    id: 'ws_out_1',
                    config: { websocket: 'websocket_1', payload: 'payload' }
                })
            ],
            connections: []
        };
        const listeners = new WorkflowWebSocketRegistry();
        const handle = await runner.start(definition, { webSocketRegistry: listeners });
        expect(handle.ports.length).toEqual(1);
        const client = new WebSocket(`ws://127.0.0.1:${handle.ports[0]}/broadcast`);
        try {
            await withTimeout(new Promise<void>((resolve, reject) => {
                client.once('open', () => resolve());
                client.once('error', reject);
            }));
            const message = new Promise<string>((resolve, reject) => {
                client.once('message', data => resolve(data.toString()));
                client.once('error', reject);
            });
            const sent = await listeners.broadcast({
                host: '127.0.0.1',
                port: handle.ports[0],
                path: '/broadcast'
            }, 'broadcast');
            expect(sent).toEqual(1);
            expect(await withTimeout(message)).toEqual('broadcast');
        } finally {
            client.close();
            await handle.stop();
        }
        expect(listeners.listenerCount).toEqual(0);
    });

    it('starts no listener for workflows without inbound nodes', async () => {
        const definition: VisualWorkflowDefinition = {
            id: 'plain',
            name: 'Plain',
            nodes: [registry.createNode('task', { x: 0, y: 0 }, { id: 'task_plain' })],
            connections: []
        };
        const handle = await runner.start(definition);
        expect(handle.ports).toEqual([]);
        await handle.stop();
    });
});
