import { Module } from '@tsdi/ioc';
import { Controller, Get, RequestPath, provideService, useRouter } from '@tsdi/service';
import { useTcpTransport } from '../src/server';
import * as net from 'node:net';
import * as fs from 'node:fs';
import expect = require('expect');

describe('TCP Microservice IPC (UNIX Domain Socket) Tests', () => {

    describe('IPC Configuration', () => {
        it('should accept IPC path configuration in transport', () => {
            @Controller('/api')
            class TestController {
                @Get('/echo/:message')
                echo(@RequestPath('message') message: string) {
                    return { echo: message };
                }
            }

            @Module({
                declarations: [TestController],
                providers: [
                    provideService(
                        useRouter(),
                        useTcpTransport({
                            listenOpts: { path: '/tmp/test.sock' },
                            asDefault: true
                        })
                    )
                ]
            })
            class IpcModule { }

            expect(IpcModule).toBeDefined();

            const providers = provideService(
                useRouter(),
                useTcpTransport({
                    listenOpts: { path: '/tmp/test.sock' },
                    asDefault: true
                })
            );
            expect(Array.isArray(providers)).toBe(true);
            expect(providers.length).toBeGreaterThan(0);
        });

        it('should create transport with IPC path', () => {
            const providers = provideService(
                useRouter(),
                useTcpTransport({
                    listenOpts: { path: '/tmp/another.sock' },
                    asDefault: true
                })
            );
            expect(Array.isArray(providers)).toBe(true);
        });
    });

    describe('Unix Socket Basics', () => {
        const ipcPath = '/tmp/test-basic-ipc.sock';

        after(() => {
            try { fs.unlinkSync(ipcPath); } catch (e) { /* ignore */ }
        });

        it('should create and listen on IPC socket', (done) => {
            try { fs.unlinkSync(ipcPath); } catch (e) { /* ignore */ }

            const server = net.createServer();
            server.on('listening', () => {
                server.close(() => done());
            });
            server.on('error', (err) => {
                server.close(() => done(err));
            });
            server.listen(ipcPath);
        });

        it('should accept client connections on IPC socket', (done) => {
            try { fs.unlinkSync(ipcPath); } catch (e) { /* ignore */ }

            const server = net.createServer((socket) => {
                socket.write('hello\n');
                socket.end();
            });

            server.listen(ipcPath, () => {
                const client = net.createConnection(ipcPath, () => {
                    let data = '';
                    client.on('data', (chunk) => {
                        data += chunk.toString();
                        if (data.includes('hello')) {
                            server.close(() => {
                                try { fs.unlinkSync(ipcPath); } catch (e) { /* ignore */ }
                                done();
                            });
                        }
                    });
                });
                client.on('error', (err) => {
                    server.close(() => {
                        try { fs.unlinkSync(ipcPath); } catch (e) { /* ignore */ }
                        done(err);
                    });
                });
            });
        });
    });
});
