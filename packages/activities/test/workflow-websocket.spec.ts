import expect = require('expect');
import * as net from 'node:net';
import { WebSocket } from 'ws';
import { WorkflowWebSocketRegistry } from '../server/WorkflowWebSocket';

function withTimeout<T>(promise: Promise<T>, timeoutMs = 4000): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('websocket test timed out')), timeoutMs);
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

async function freePort(): Promise<number> {
    const server = net.createServer();
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()));
    const address = server.address() as net.AddressInfo;
    await new Promise<void>(resolve => server.close(() => resolve()));
    return address.port;
}

function open(url: string): Promise<WebSocket> {
    return withTimeout(new Promise<WebSocket>((resolve, reject) => {
        const socket = new WebSocket(url);
        socket.once('open', () => resolve(socket));
        socket.once('error', reject);
    }));
}

function nextMessage(socket: WebSocket): Promise<string> {
    return withTimeout(new Promise<string>((resolve, reject) => {
        socket.once('message', data => resolve(data.toString()));
        socket.once('error', reject);
    }));
}

function waitFor(predicate: () => boolean): Promise<void> {
    return withTimeout(new Promise<void>(resolve => {
        const tick = () => predicate() ? resolve() : setTimeout(tick, 10);
        tick();
    }));
}

describe('shared WebSocket listeners', () => {
    let registry: WorkflowWebSocketRegistry;

    beforeEach(() => {
        registry = new WorkflowWebSocketRegistry();
    });

    afterEach(() => {
        registry.close();
    });

    it('shares one server between handlers and fans messages out', async () => {
        const first: string[] = [];
        const second: string[] = [];
        const firstHandle = await registry.listen(
            { host: '127.0.0.1', port: 0, path: '/shared' },
            message => {
                first.push(message.data);
                message.reply?.('ack');
            }
        );
        const secondHandle = await registry.listen(
            { host: '127.0.0.1', port: 0, path: '/shared' },
            message => {
                second.push(message.data);
            }
        );
        expect(secondHandle.port).toEqual(firstHandle.port);
        expect(registry.listenerCount).toEqual(1);

        const client = await open(`ws://127.0.0.1:${firstHandle.port}/shared`);
        try {
            const reply = nextMessage(client);
            client.send('hello');
            expect(await reply).toEqual('ack');
            await waitFor(() => first.length === 1 && second.length === 1);
            expect(first).toEqual(['hello']);
            expect(second).toEqual(['hello']);

            // Releasing one handler keeps the shared server alive for the other.
            await firstHandle.close();
            expect(registry.listenerCount).toEqual(1);
            client.send('again');
            await waitFor(() => second.length === 2);
            expect(first).toEqual(['hello']);
            expect(second).toEqual(['hello', 'again']);
        } finally {
            client.close();
            await secondHandle.close();
        }
        expect(registry.listenerCount).toEqual(0);
    });

    it('broadcasts to every connected client of the running listener', async () => {
        const port = await freePort();
        const handle = await registry.listen({ host: '127.0.0.1', port, path: '/live' });
        const first = await open(`ws://127.0.0.1:${port}/live`);
        const second = await open(`ws://127.0.0.1:${port}/live`);
        try {
            const firstMessage = nextMessage(first);
            const secondMessage = nextMessage(second);
            const sent = await registry.broadcast({ host: '127.0.0.1', port, path: '/live' }, 'broadcast');
            expect(sent).toEqual(2);
            expect(await firstMessage).toEqual('broadcast');
            expect(await secondMessage).toEqual('broadcast');
        } finally {
            first.close();
            second.close();
            await handle.close();
        }
    });

    it('reports a missing listener instead of silently dropping the payload', async () => {
        let error: Error | undefined;
        try {
            await registry.broadcast({ host: '127.0.0.1', port: 6553, path: '/none' }, 'x');
        } catch (caught) {
            error = caught as Error;
        }
        expect(error?.message).toContain('WebSocket listener is not running');
    });
});
