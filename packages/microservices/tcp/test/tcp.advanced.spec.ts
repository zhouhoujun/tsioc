import expect = require('expect');
import * as net from 'node:net';
import * as tls from 'node:tls';
import * as fs from 'fs';
import * as path from 'path';

describe('Advanced: Connection Lifecycle', () => {
    let server: net.Server;
    const testPort = 8890;

    before((done) => {
        server = net.createServer();
        server.listen(testPort, () => done());
    });

    after((done) => {
        server.close(() => done());
    });

    it('should handle connection close event', (done) => {
        const client = net.connect({ port: testPort }, () => {
            client.end();
            client.on('close', () => {
                done();
            });
        });
    });

    it('should handle connection error gracefully', (done) => {
        const client = net.connect({ port: 61000 }, () => {});
        client.on('error', (err: any) => {
            expect(err).toBeDefined();
            done();
        });
    });
});

describe('Advanced: Data Handling', () => {
    let server: net.Server;
    const testPort = 8891;

    before((done) => {
        server = net.createServer((socket) => {
            socket.on('data', (data) => {
                socket.write(data);
            });
        });
        server.listen(testPort, () => done());
    });

    after((done) => {
        server.close(() => done());
    });

    it('should handle UTF-8 encoding', (done) => {
        const client = net.connect({ port: testPort }, () => {
            const testStr = 'Hello World 你好世界';
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
            client.write(JSON.stringify(obj));
            client.on('data', (data) => {
                const parsed = JSON.parse(data.toString());
                expect(parsed).toEqual(obj);
                client.end();
                done();
            });
        });
    });
});

describe('Advanced: Timeout & KeepAlive', () => {
    let server: net.Server;
    const testPort = 8892;

    before((done) => {
        server = net.createServer();
        server.listen(testPort, () => done());
    });

    after((done) => {
        server.close(() => done());
    });

    it('should set keepalive', (done) => {
        const client = net.connect({ port: testPort }, () => {
            client.setKeepAlive(true, 1000);
            expect(client).toBeDefined();
            setTimeout(() => {
                expect(client.destroyed).toBe(false);
                client.end();
                done();
            }, 500);
        });
    });

    it('should handle socket timeout', (done) => {
        const client = net.connect({ port: testPort }, () => {
            client.setTimeout(200);
            client.on('timeout', () => {
                expect(client).toBeDefined();
                client.end();
                done();
            });
        });
    });
});

describe('Advanced: Multiple Connections', () => {
    let server: net.Server;
    const testPort = 8893;

    before((done) => {
        server = net.createServer((socket) => {
            socket.on('data', (data) => {
                socket.write(data);
            });
        });
        server.listen(testPort, () => done());
    });

    after((done) => {
        server.close(() => done());
    });

    it('should handle 10 concurrent connections', (done) => {
        const clientCount = 10;
        let completedCount = 0;

        for (let i = 0; i < clientCount; i++) {
            const client = net.connect({ port: testPort }, () => {
                client.write(`client${i}`);
                client.on('data', (data) => {
                    expect(data.toString()).toBe(`client${i}`);
                    client.end();
                    completedCount++;

                    if (completedCount === clientCount) {
                        done();
                    }
                });
            });
        }
    });
});

describe('Advanced: Error Scenarios', () => {
    it('should handle connection refused', (done) => {
        const client = net.connect({ port: 61000, host: 'localhost' });
        client.on('error', (err: any) => {
            expect(err.code).toMatch(/ECONNREFUSED|ENOTFOUND/);
            done();
        });
    });

    it('should handle connection reset', (done) => {
        const server = net.createServer((socket) => {
            socket.destroy();
        });
        const port = 8894;

        server.listen(port, () => {
            const client = net.connect({ port }, () => {
                client.on('error', () => {
                });
                client.on('close', () => {
                    server.close();
                    done();
                });
            });
        });
    });
});

describe('Advanced: Large Data Transfer', () => {
    let server: net.Server;
    const testPort = 8895;

    before((done) => {
        server = net.createServer((socket) => {
            socket.on('data', (data) => {
                socket.write(data);
            });
        });
        server.listen(testPort, () => done());
    });

    after((done) => {
        server.close(() => done());
    });

    it('should handle 100KB data packet', (done) => {
        const client = net.connect({ port: testPort }, () => {
            const largeData = Buffer.alloc(100 * 1024, 'a');
            client.write(largeData);

            let received = Buffer.alloc(0);
            client.on('data', (data) => {
                received = Buffer.concat([received, data]);

                if (received.length >= largeData.length) {
                    expect(received.length).toBe(largeData.length);
                    client.end();
                    done();
                }
            });
        });
    });
});