import expect = require('expect');
import * as fs from 'node:fs';
import * as http2 from 'node:http2';
import * as os from 'node:os';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createInjector } from '@tsdi/ioc';
import { createRequestContext } from '@tsdi/common';
import { HTTP_RESPONSE, HttpMessageAdapter } from '@tsdi/http-microservice';
import { GatewayInterceptor } from '../src/gateway.interceptor';
import { GatewayRuntime } from '../src/gateway.runtime';

function opensslAvailable(): boolean {
    try {
        execFileSync('openssl', ['version'], { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

describe('Gateway HTTP/2 upstream', () => {
    let dir: string | undefined;
    let key: Buffer;
    let cert: Buffer;

    before(() => {
        if (!opensslAvailable()) {
            return;
        }
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdi-h2-'));
        const keyFile = path.join(dir, 'key.pem');
        const certFile = path.join(dir, 'cert.pem');
        execFileSync('openssl', [
            'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
            '-keyout', keyFile, '-out', certFile,
            '-subj', '/CN=localhost', '-days', '1'
        ], { stdio: 'ignore' });
        key = fs.readFileSync(keyFile);
        cert = fs.readFileSync(certFile);
    });

    after(() => {
        if (dir) {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    function request() {
        return {
            url: '/api/h2',
            method: 'GET',
            headers: {},
            getHeader() { return undefined; },
            socket: { remoteAddress: '127.0.0.1' }
        } as any;
    }

    function context() {
        const adapter = {
            setHeader() { return this; },
            setStatus() { return this; },
            setPayload() { return this; },
            sendResponse() { return; }
        };
        const ctx = createRequestContext(createInjector());
        ctx.set(HttpMessageAdapter, adapter as any);
        ctx.set(HTTP_RESPONSE, { end() { return undefined; } } as any);
        return ctx;
    }

    function call(interceptor: GatewayInterceptor): Promise<any> {
        return new Promise((resolve, reject) => {
            interceptor.intercept(request(), { handle: () => null } as any, context())
                .subscribe({ next: resolve, error: reject });
        });
    }

    (opensslAvailable() ? it : it.skip)('negotiates h2 when httpPool.allowH2 is enabled', async () => {
        let protocol = '';
        const server = http2.createSecureServer({ key, cert });
        server.on('stream', stream => {
            protocol = (stream.session as any).alpnProtocol;
            stream.respond({ ':status': 200, 'content-type': 'application/json' });
            stream.end(JSON.stringify({ h2: true }));
        });
        await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()));
        const port = (server.address() as any).port;
        const interceptor = new GatewayInterceptor({
            routes: [{
                path: '/api',
                service: 'h2-service',
                targetUrl: `https://127.0.0.1:${port}`
            }],
            httpPool: {
                allowH2: true,
                connect: { rejectUnauthorized: false }
            }
        }, null as any, null as any, new GatewayRuntime(), null as any, null as any);

        try {
            const payload = await call(interceptor);
            expect(payload).toEqual({ h2: true });
            expect(protocol).toBe('h2');
        } finally {
            interceptor.onDestroy();
            await new Promise<void>(resolve => server.close(() => resolve()));
        }
    });
});
