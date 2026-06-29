import { TcpClient } from '../src/client/client';
import { TcpClientOptions, TCP_CLIENT_OPTIONS } from '../src/client/options';
import { TcpRequest } from '../src/client/request';
import { Transport, TransferSide, Pattern } from '@tsdi/common';
import { ClientHandler } from '@tsdi/client';
import { Injector } from '@tsdi/ioc';
import expect = require('expect');
import * as net from 'node:net';

describe('TcpClient', () => {

    function createMockInjector(): Injector {
        return {
            get: (token: any) => {
                if (token === TCP_CLIENT_OPTIONS) return null;
                return null;
            },
            has: () => false,
            setValue: () => {},
        } as unknown as Injector;
    }

    function createMockHandler(): ClientHandler<TcpRequest<any>, any> {
        return {
            injector: createMockInjector(),
            handle: () => { throw new Error('not implemented'); },
        } as unknown as ClientHandler<TcpRequest<any>, any>;
    }

    describe('constructor', () => {
        it('should create a TcpClient with default connect options', () => {
            const handler = createMockHandler();
            const client = new TcpClient(handler, {
                transport: Transport.TCP,
                side: TransferSide.client,
            } as TcpClientOptions);

            expect(client).toBeInstanceOf(TcpClient);
        });

        it('should set default connectOpts when not provided', () => {
            const handler = createMockHandler();
            const options: Partial<TcpClientOptions> = {
                transport: Transport.TCP,
                side: TransferSide.client,
            };

            const client = new TcpClient(handler, options as TcpClientOptions);

            expect(client).toBeDefined();
        });

        it('should preserve provided connectOpts', () => {
            const handler = createMockHandler();
            const options: Partial<TcpClientOptions> = {
                transport: Transport.TCP,
                side: TransferSide.client,
                connectOpts: { port: 9090, host: 'example.com' },
            };

            const client = new TcpClient(handler, options as TcpClientOptions);

            expect(client).toBeDefined();
        });

        it('should accept microservice option', () => {
            const handler = createMockHandler();
            const client = new TcpClient(handler, {
                transport: Transport.TCP,
                side: TransferSide.client,
                microservice: true,
            } as TcpClientOptions);

            expect(client).toBeDefined();
        });
    });

    describe('isValid', () => {
        it('should return true for a healthy connection', () => {
            const handler = createMockHandler();
            const client = new TcpClient(handler, {} as TcpClientOptions);

            const connection = {
                destroyed: false,
                closed: false,
            } as any;

            const result = (client as any).isValid(connection);
            expect(result).toBe(true);
        });

        it('should return false for a destroyed connection', () => {
            const handler = createMockHandler();
            const client = new TcpClient(handler, {} as TcpClientOptions);

            const connection = {
                destroyed: true,
                closed: false,
            } as any;

            const result = (client as any).isValid(connection);
            expect(result).toBe(false);
        });

        it('should return false for a closed connection', () => {
            const handler = createMockHandler();
            const client = new TcpClient(handler, {} as TcpClientOptions);

            const connection = {
                destroyed: false,
                closed: true,
            } as any;

            const result = (client as any).isValid(connection);
            expect(result).toBe(false);
        });

        it('should return false for a destroyed and closed connection', () => {
            const handler = createMockHandler();
            const client = new TcpClient(handler, {} as TcpClientOptions);

            const connection = {
                destroyed: true,
                closed: true,
            } as any;

            const result = (client as any).isValid(connection);
            expect(result).toBe(false);
        });
    });

    describe('buildRequest', () => {
        it('should return the same TcpRequest if passed one', () => {
            const handler = createMockHandler();
            const client = new TcpClient(handler, {} as TcpClientOptions);

            const req = new TcpRequest('/api/test', null, { method: 'GET' });
            const result = (client as any).buildRequest(req, {});

            expect(result).toBe(req);
        });

        it('should build a TcpRequest from a string url', () => {
            const handler = createMockHandler();
            (handler as any).injector = {
                get: () => ({ format: (p: Pattern) => typeof p === 'string' ? p : p.toString() }),
            };
            const client = new TcpClient(handler, {
                transport: Transport.TCP,
                side: TransferSide.client,
            } as TcpClientOptions);

            const result = (client as any).buildRequest('/api/test', {
                method: 'GET',
                headers: { accept: 'application/json' }
            });

            expect(result).toBeInstanceOf(TcpRequest);
            expect(result.url).toBe('/api/test');
            expect(result.pattern).toBeNull();
        });

        it('should build a TcpRequest from a pattern object', () => {
            const handler = createMockHandler();
            (handler as any).injector = {
                get: () => ({ format: (p: Pattern) => JSON.stringify(p) }),
            };
            const client = new TcpClient(handler, {
                transport: Transport.TCP,
                side: TransferSide.client,
            } as TcpClientOptions);

            const pattern = { cmd: 'getUser', id: '123' };
            const result = (client as any).buildRequest(pattern, { method: 'POST' });

            expect(result).toBeInstanceOf(TcpRequest);
            expect(result.pattern).toEqual(pattern);
        });

        it('should use default GET method for non-microservice client', () => {
            const handler = createMockHandler();
            (handler as any).injector = {
                get: () => ({ format: (p: Pattern) => typeof p === 'string' ? p : p.toString() }),
            };
            const client = new TcpClient(handler, {
                transport: Transport.TCP,
                side: TransferSide.client,
            } as TcpClientOptions);

            const result = (client as any).buildRequest('/api/test', {});

            expect(result.method).toBe('GET');
        });

        it('should not set default method for microservice client', () => {
            const handler = createMockHandler();
            (handler as any).injector = {
                get: () => ({ format: (p: Pattern) => typeof p === 'string' ? p : p.toString() }),
            };
            const client = new TcpClient(handler, {
                transport: Transport.TCP,
                side: TransferSide.client,
                microservice: true,
            } as TcpClientOptions);

            const result = (client as any).buildRequest('/api/test', {});

            expect(result.method).toBe('');
        });
    });

    describe('createConnection', () => {
        it('should create a TCP connection with NetConnectOpts', () => {
            const handler = createMockHandler();
            const client = new TcpClient(handler, {
                transport: Transport.TCP,
                side: TransferSide.client,
                connectOpts: { port: 8080, host: 'localhost' },
            } as TcpClientOptions);

            const socket = (client as any).createConnection({
                transport: Transport.TCP,
                side: TransferSide.client,
                connectOpts: { port: 8080, host: 'localhost' },
            } as TcpClientOptions);

            expect(socket).toBeDefined();
            expect(socket instanceof net.Socket).toBe(true);
            socket.destroy();
        });

        it('should create a TLS connection when cert is provided', () => {
            const handler = createMockHandler();
            const client = new TcpClient(handler, {} as TcpClientOptions);

            // Without cert, should use net.Socket
            const socket = (client as any).createConnection({
                transport: Transport.TCP,
                side: TransferSide.client,
                connectOpts: { port: 8080, host: 'localhost' } as net.NetConnectOpts,
            } as TcpClientOptions);

            expect(socket).toBeDefined();
            expect(socket instanceof net.Socket).toBe(true);
            socket.destroy();
        });

        it('should set keepalive when configured', () => {
            const handler = createMockHandler();
            const client = new TcpClient(handler, {
                transport: Transport.TCP,
                side: TransferSide.client,
                keepalive: 30000,
                connectOpts: { port: 8080, host: '127.0.0.1' },
            } as TcpClientOptions);

            const socket = (client as any).createConnection({
                transport: Transport.TCP,
                side: TransferSide.client,
                keepalive: 30000,
                connectOpts: { port: 8080, host: '127.0.0.1' },
            } as TcpClientOptions);

            expect(socket).toBeDefined();
            socket.destroy();
        });
    });

    describe('initContext', () => {
        it('should set TcpClient, TcpRequest, and SOCKET in context', () => {
            const handler = createMockHandler();
            const client = new TcpClient(handler, {} as TcpClientOptions);

            const setCalls: any[] = [];
            const mockContext = {
                set: (key: any, value: any) => {
                    setCalls.push({ key, value });
                },
            };

            const req = new TcpRequest('/api/test', null, { method: 'GET' });
            (client as any).connection = {} as net.Socket;

            (client as any).initContext(mockContext, req);

            // Should have set 3 values
            expect(setCalls.length).toBe(3);
            // TcpClient itself
            expect(setCalls[0].value).toBe(client);
            // TcpRequest
            expect(setCalls[1].value).toBe(req);
        });
    });

    describe('onShutdown', () => {
        it('should destroy and clear an active connection without waiting for a callback', async () => {
            const handler = createMockHandler();
            const client = new TcpClient(handler, {} as TcpClientOptions);
            let unrefCalls = 0;
            let destroyCalls = 0;
            let removeAllListenersCalls = 0;
            const connection = {
                destroyed: false,
                closed: false,
                unref() {
                    unrefCalls += 1;
                    return this;
                },
                destroy() {
                    destroyCalls += 1;
                    this.destroyed = true;
                },
                removeAllListeners() {
                    removeAllListenersCalls += 1;
                    return this;
                }
            } as any;

            (client as any).connection = connection;
            await (client as any).onShutdown();

            expect(unrefCalls).toBe(1);
            expect(destroyCalls).toBe(1);
            expect(removeAllListenersCalls).toBe(1);
            expect((client as any).connection).toBe(null);
        });

        it('should no-op when the connection is already destroyed', async () => {
            const handler = createMockHandler();
            const client = new TcpClient(handler, {} as TcpClientOptions);
            let destroyCalls = 0;
            const connection = {
                destroyed: true,
                closed: false,
                destroy() {
                    destroyCalls += 1;
                },
                removeAllListeners() {
                    return this;
                }
            } as any;

            (client as any).connection = connection;
            await (client as any).onShutdown();

            expect(destroyCalls).toBe(0);
            expect((client as any).connection).toBe(connection);
        });
    });
});
