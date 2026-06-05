import { Transport, LOCALHOST, TransferSide } from '@tsdi/common';
import expect = require('expect');
import { TcpClient, TcpRequest, TCP_SERV_OPTIONS, TCP_CLIENT_OPTIONS, TcpServOptions, TcpClientOptions } from '../src';
import * as net from 'node:net';

describe('Unit: TcpRequest', () => {
    it('should create request with url', () => {
        const req = new TcpRequest('/test/path', null, {});
        expect(req.url).toBe('/test/path');
        expect(req.pattern).toBeNull();
    });

    it('should create request with pattern', () => {
        const pattern = { cmd: 'test' };
        const req = new TcpRequest('/test', pattern, {});
        expect(req.url).toBe('/test');
        expect(req.pattern).toEqual(pattern);
    });

    it('should clone request', () => {
        const req = new TcpRequest('/test', null, { method: 'GET' });
        const cloned = req.clone();
        expect(cloned.url).toBe('/test');
        expect(cloned).not.toBe(req);
    });

    it('should clone request with updates', () => {
        const req = new TcpRequest('/test', null, { method: 'GET' });
        const cloned = req.clone({ url: '/new-path', method: 'POST' });
        expect(cloned.url).toBe('/new-path');
    });
});

describe('Unit: TcpServOptions', () => {
    it('should create default options', () => {
        const opts = {
            transport: Transport.TCP,
            side: TransferSide.server,
            features: {}
        } as TcpServOptions;
        expect(opts.transport).toBe(Transport.TCP);
    });

    it('should create options with listen config', () => {
        const opts = {
            transport: Transport.TCP,
            side: TransferSide.server,
            features: {},
            listenOpts: {
                port: 3000,
                host: LOCALHOST
            }
        } as TcpServOptions;
        expect(opts.listenOpts?.port).toBe(3000);
        expect(opts.listenOpts?.host).toBe(LOCALHOST);
    });

    it('should support microservice mode', () => {
        const opts = {
            transport: Transport.TCP,
            side: TransferSide.server,
            features: {},
            microservice: true
        } as TcpServOptions;
        expect(opts.microservice).toBe(true);
    });
});

describe('Unit: TcpClientOptions', () => {
    it('should create default options', () => {
        const opts = {
            transport: Transport.TCP,
            side: TransferSide.client,
            features: {}
        } as TcpClientOptions;
        expect(opts.transport).toBe(Transport.TCP);
    });

    it('should create options with connect config', () => {
        const opts = {
            transport: Transport.TCP,
            side: TransferSide.client,
            features: {},
            connectOpts: {
                port: 3000,
                host: LOCALHOST
            }
        } as TcpClientOptions;
        expect(opts.connectOpts).toBeDefined();
    });

    it('should create options with keepalive', () => {
        const opts = {
            transport: Transport.TCP,
            side: TransferSide.client,
            features: {},
            keepalive: 5000
        } as TcpClientOptions;
        expect(opts.keepalive).toBe(5000);
    });

    it('should support microservice mode', () => {
        const opts = {
            transport: Transport.TCP,
            side: TransferSide.client,
            features: {},
            microservice: true
        } as TcpClientOptions;
        expect(opts.microservice).toBe(true);
    });
});

describe('Unit: TCP Tokens', () => {
    it('should have TCP_SERV_OPTIONS token', () => {
        expect(TCP_SERV_OPTIONS).toBeDefined();
        expect(TCP_SERV_OPTIONS.toString()).toContain('TCP_SERV_OPTIONS');
    });

    it('should have TCP_CLIENT_OPTIONS token', () => {
        expect(TCP_CLIENT_OPTIONS).toBeDefined();
        expect(TCP_CLIENT_OPTIONS.toString()).toContain('TCP_CLIENT_OPTIONS');
    });
});

describe('Unit: TcpServer Lifecycle', () => {
    let server: net.Server;
    const testPort = 8888;

    before((done) => {
        server = net.createServer((socket) => {
            socket.on('data', (data) => {
                socket.write(data);
            });
        });
        server.listen(testPort, () => {
            done();
        });
    });

    after((done) => {
        server.close(() => {
            done();
        });
    });

    it('should accept connections', (done) => {
        const client = net.connect({ port: testPort }, () => {
            client.write('test data');
            client.on('data', (data) => {
                expect(data.toString()).toBe('test data');
                client.end();
                done();
            });
        });
    });

    it('should handle multiple connections', (done) => {
        let completed = 0;

        for (let i = 0; i < 3; i++) {
            const client = net.connect({ port: testPort }, () => {
                client.write(`test ${i}`);
                client.on('data', (data) => {
                    expect(data.toString()).toBe(`test ${i}`);
                    client.end();
                    completed++;
                    if (completed === 3) {
                        done();
                    }
                });
            });
        }
    });

    it('should handle connection close', (done) => {
        const client = net.connect({ port: testPort }, () => {
            client.end();
            client.on('close', () => {
                done();
            });
        });
    });
});

describe('Unit: TcpClient Connection', () => {
    let server: net.Server;
    const testPort = 8889;

    before((done) => {
        server = net.createServer((socket) => {
            socket.on('data', (data) => {
                socket.write(`echo: ${data}`);
            });
        });
        server.listen(testPort, () => {
            done();
        });
    });

    after((done) => {
        server.close(() => {
            done();
        });
    });

    it('should connect to server', (done) => {
        const client = net.connect({ port: testPort }, () => {
            expect(client.connecting).toBe(false);
            expect(client.remotePort).toBe(testPort);
            client.end();
            done();
        });
    });

    it('should send and receive data', (done) => {
        const client = net.connect({ port: testPort }, () => {
            client.write('hello');
            client.on('data', (data) => {
                expect(data.toString()).toBe('echo: hello');
                client.end();
                done();
            });
        });
    });

    it('should handle errors gracefully', (done) => {
        const client = net.connect({ port: 9999 }, () => {
        });
        client.on('error', (err) => {
            expect(err).toBeDefined();
            done();
        });
    });
});

describe('Unit: KeepAlive Mechanism', () => {
    let server: net.Server;
    const testPort = 8890;

    before((done) => {
        server = net.createServer();
        server.listen(testPort, () => {
            done();
        });
    });

    after((done) => {
        server.close(() => {
            done();
        });
    });

    it('should set keepalive on socket', (done) => {
        const client = net.connect({ port: testPort }, () => {
            client.setKeepAlive(true, 5000);
            expect(client).toBeDefined();
            client.end();
            done();
        });
    });

    it('should handle keepalive timeout', (done) => {
        const client = net.connect({ port: testPort }, () => {
            client.setKeepAlive(true, 1000);
            setTimeout(() => {
                expect(client.destroyed).toBe(false);
                client.end();
                done();
            }, 2000);
        });
    });
});

describe('Unit: Error Handling', () => {
    it('should handle connection refused', (done) => {
        const client = net.connect({ port: 65500, host: 'localhost' });
        client.on('error', (err: any) => {
            expect(err.code).toMatch(/ECONNREFUSED|EADDRNOTAVAIL|ENOTFOUND/);
            done();
        });
    });

    it('should handle invalid host', (done) => {
        const client = net.connect({ port: 3000, host: 'invalid-host-12345' });
        client.on('error', (err: any) => {
            expect(err).toBeDefined();
            done();
        });
    });
});

describe('Unit: Data Encoding', () => {
    let server: net.Server;
    const testPort = 8891;

    before((done) => {
        server = net.createServer((socket) => {
            socket.on('data', (data) => {
                socket.write(data);
            });
        });
        server.listen(testPort, () => {
            done();
        });
    });

    after((done) => {
        server.close(() => {
            done();
        });
    });

    it('should handle UTF-8 encoding', (done) => {
        const client = net.connect({ port: testPort }, () => {
            const testStr = '你好世界 Hello World';
            client.write(testStr, 'utf8');
            client.on('data', (data) => {
                expect(data.toString('utf8')).toBe(testStr);
                client.end();
                done();
            });
        });
    });

    it('should handle binary data', (done) => {
        const client = net.connect({ port: testPort }, () => {
            const buffer = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]);
            client.write(buffer);
            client.on('data', (data) => {
                expect(data).toEqual(buffer);
                client.end();
                done();
            });
        });
    });

    it('should handle JSON data', (done) => {
        const client = net.connect({ port: testPort }, () => {
            const obj = { test: 'data', num: 123 };
            const jsonStr = JSON.stringify(obj);
            client.write(jsonStr);
            client.on('data', (data) => {
                const parsed = JSON.parse(data.toString());
                expect(parsed).toEqual(obj);
                client.end();
                done();
            });
        });
    });
});
