import expect = require('expect');
import { EventEmitter } from 'events';
import { createInjector } from '@tsdi/ioc';
import { Logger } from '@tsdi/logger';
import { McpServer } from '../src/server/mcp-server';

class FakeServer extends EventEmitter {
    public closeCalls = 0;
    public removed = 0;
    public listening = false;
    public lastListen: any;
    public shouldFailListen = false;
    public unrefCalls = 0;

    listen(opts: any, callback?: () => void) {
        this.lastListen = opts;
        if (this.shouldFailListen) {
            process.nextTick(() => this.emit('error', Object.assign(new Error('listen failed'), { code: 'EPERM' })));
            return this;
        }
        this.listening = true;
        process.nextTick(() => {
            this.emit('listening');
            callback?.();
        });
        return this;
    }

    close(callback?: (err?: Error | null) => void) {
        this.closeCalls += 1;
        const err = this.listening ? null : Object.assign(new Error('Server is not running.'), { code: 'ERR_SERVER_NOT_RUNNING' });
        this.listening = false;
        process.nextTick(() => {
            this.emit('close');
            callback?.(err as any);
        });
        return this;
    }

    unref() {
        this.unrefCalls += 1;
        return this;
    }

    removeAllListeners(event?: string | symbol) {
        this.removed += 1;
        return super.removeAllListeners(event as any);
    }
}

class TestMcpServer extends McpServer<any, any> {
    constructor(handler: any, options: any) {
        super(handler, options);
    }

    public assignServer(server: any) {
        (this as any).server = server;
    }
}

describe('McpServer shutdown and startup guards', () => {
    function createServer(options: any = {}) {
        const injector = createInjector();
        const handler = { injector, handle: () => ({ pipe: () => ({ subscribe() {} }) }) } as any;
        const server = new TestMcpServer(handler, options);
        (server as any).logger = {
            info() {},
            error() {},
            warn() {}
        } as Logger;
        return server;
    }

    it('ignores ERR_SERVER_NOT_RUNNING during shutdown', async () => {
        const server = createServer();
        const raw = new FakeServer();
        server.assignServer(raw);

        await server.onShutdown();

        expect(raw.closeCalls).toBe(1);
        expect(raw.unrefCalls).toBe(1);
        expect((server as any).server).toBe(null);
    });

    it('rejects startup when listen emits an error', async () => {
        const server = createServer({ microservice: true, listenOpts: { port: 3100, host: '127.0.0.1' } });
        const raw = new FakeServer();
        raw.shouldFailListen = true;
        server.assignServer(raw);

        await expect(server.onStart()).rejects.toMatchObject({ code: 'EPERM' });
    });
});
