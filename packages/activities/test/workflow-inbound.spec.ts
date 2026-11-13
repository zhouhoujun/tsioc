import expect = require('expect');
import * as dgram from 'node:dgram';
import * as net from 'node:net';
import { createInjector, Injector, InjectUtil } from '@tsdi/ioc';
import { WorkflowModule } from '../src/workflow.module';
import { WorkflowNodeRegistry } from '../src/visual/node-registry';
import { VisualWorkflowService } from '../src/visual/VisualWorkflowService';
import { WorkflowInboundRunner } from '../server/WorkflowInboundRunner';
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

    function definition(type: 'tcp-in' | 'udp-in'): VisualWorkflowDefinition {
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
