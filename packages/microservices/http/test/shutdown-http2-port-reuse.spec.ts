import { Module } from '@tsdi/ioc';
import { Application } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { provideService, useRouter, Controller, Get } from '@tsdi/service';
import { useHttpTransport } from '../src/server';
import * as http2 from 'node:http2';
import expect = require('expect');

const PORT = 3010;

@Controller()
class PingCtrl {
    @Get('/ping') ping() { return 'pong'; }
}

function createModule() {
    @Module({
        imports: [LoggerModule],
        declarations: [PingCtrl],
        providers: [
            provideService(
                useRouter(),
                useHttpTransport({
                    majorVersion: 2,
                    listenOpts: { port: PORT, host: '127.0.0.1' },
                    asDefault: true,
                }),
            ),
        ],
    })
    class TestApp { }
    return TestApp;
}

function requestWithPersistentSession() {
    return new Promise<http2.ClientHttp2Session>((resolve, reject) => {
        const session = http2.connect(`http://127.0.0.1:${PORT}`);
        const req = session.request({
            ':method': 'GET',
            ':path': '/ping'
        });
        let body = '';
        req.setEncoding('utf8');
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                expect(body).toContain('pong');
                resolve(session);
            } catch (err) {
                session.destroy();
                reject(err);
            }
        });
        req.on('error', err => {
            session.destroy();
            reject(err);
        });
        session.on('error', reject);
        req.end();
    });
}

function waitForSessionClose(session: http2.ClientHttp2Session) {
    if (session.closed || session.destroyed) {
        return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
            session.destroy();
            reject(new Error('HTTP/2 session did not close during server shutdown.'));
        }, 1000);
        session.once('close', () => {
            clearTimeout(timer);
            resolve();
        });
    });
}

describe('HTTP/2 shutdown port release', () => {
    it('should release the port and close active sessions on shutdown', async () => {
        const ctx = await Application.run(createModule());
        const session = await requestWithPersistentSession();

        await ctx.close();
        await waitForSessionClose(session);

        const next = await Application.run(createModule());
        expect(next).toBeDefined();
        await next.close();
    });
});
