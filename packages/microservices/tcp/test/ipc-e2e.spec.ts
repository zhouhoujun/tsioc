import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { Controller, Get, RequestPath, provideService, withServiceRouter } from '@tsdi/service';
import { withTcpTransport } from '../src/server';
import * as net from 'node:net';
import * as fs from 'node:fs';
import expect = require('expect');

describe('TCP Microservice IPC (UNIX Domain Socket) End-to-End Test', () => {

    const ipcPath = '/tmp/tcp-microservice-test.sock';

    @Controller('/api')
    class IpcaController {

        @Get('/echo/:message')
        echo(
            @RequestPath('message') message: string
        ) {
            return {
                echo: message,
                received: true
            };
        }

        @Get('/add/:a/:b')
        add(
            @RequestPath('a') a: number,
            @RequestPath('b') b: number
        ) {
            return {
                result: a + b
            };
        }
    }

    @Module({
        imports: [LoggerModule],
        declarations: [IpcaController],
        providers: [
            ...provideService(
                withServiceRouter(),
                withTcpTransport({
                    listenOpts: { path: ipcPath },
                    asDefault: true
                })
            )
        ]
    })
    class IpcModule { }

    let ctx: ApplicationContext;

    before(async () => {
        // Remove any existing socket file
        try {
            fs.unlinkSync(ipcPath);
        } catch (e) {
            // Ignore if doesn't exist
        }

        ctx = await Application.run(IpcModule);
        // Wait for server to bind
        await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should echo message via IPC socket', async () => {
        const request = JSON.stringify({
            path: '/api/echo/hello-world',
            method: 'GET'
        });

        const response = await sendIpcRequest(ipcPath, request);
        const result = JSON.parse(response);

        expect(result.echo).toBe('hello-world');
        expect(result.received).toBe(true);
    });

    it('should handle numeric path parameters via IPC', async () => {
        const request = JSON.stringify({
            path: '/api/add/10/20',
            method: 'GET'
        });

        const response = await sendIpcRequest(ipcPath, request);
        const result = JSON.parse(response);

        expect(result.result).toBe(30);
    });

    after(async () => {
        if (ctx) {
            await ctx.close();
        }

        // Cleanup socket file
        try {
            fs.unlinkSync(ipcPath);
        } catch (e) {
            // Ignore
        }
    });
});

/**
 * Helper to send a request via IPC socket
 */
function sendIpcRequest(path: string, data: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const socket = new net.Socket();
        let response = '';

        socket.connect(path, () => {
            socket.write(JSON.stringify(data) + '\n');
        });

        socket.on('data', (chunk) => {
            response += chunk.toString();
            if (response.endsWith('\n')) {
                socket.destroy();
                resolve(response.trim());
            }
        });

        socket.on('error', (err) => {
            socket.destroy();
            reject(err);
        });

        socket.on('close', () => {
            if (response) {
                resolve(response.trim());
            }
        });

        setTimeout(() => {
            socket.destroy();
            reject(new Error('IPC request timeout'));
        }, 5000);
    });
}
