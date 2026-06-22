import expect = require('expect');
import * as http from 'node:http';
import type { Invocation } from '@tsdi/ioc';
import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { HttpServer, useHttpTransport } from '@tsdi/http';
import { AuthOptions, Controller, Get, provideService, useAuth, useRouter } from '@tsdi/service';
import { LoggerModule } from '@tsdi/logger';
import { JWTService } from '../src';

function requestJson(port: number, path: string, headers?: http.OutgoingHttpHeaders): Promise<{ status: number; body: any }> {
    return new Promise((resolve, reject) => {
        const req = http.request({
            host: '127.0.0.1',
            port,
            path,
            method: 'GET',
            headers
        }, (res) => {
            let text = '';
            res.setEncoding('utf8');
            res.on('data', chunk => text += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode ?? 0,
                    body: text ? JSON.parse(text) : null
                });
            });
        });
        req.on('error', reject);
        req.end();
    });
}

describe('security http auth e2e', () => {
    const authOptions: AuthOptions = {
        bearerToken: 'secret-token',
        jwt: { publicKey: 'jwt-secret', algorithms: ['HS256'] }
    };

    @Controller('/auth')
    class AuthController {
        @Get('/check')
        check() {
            return { ok: true };
        }
    }

    @Module({
        imports: [LoggerModule],
        declarations: [AuthController],
        providers: [
            provideService(
                useRouter(),
                useAuth(authOptions),
                useHttpTransport({ listenOpts: { port: 0, host: '127.0.0.1' }, asDefault: true })
            )
        ]
    })
    class AuthApp { }

    let ctx: ApplicationContext;
    let port: number;

    before(async () => {
        ctx = await Application.run(AuthApp);
        const serverRef: Invocation<HttpServer> = ctx.runners.getRef(HttpServer);
        const server = serverRef.instance.server;
        if (!server) {
            throw new Error('HTTP server is not initialized');
        }
        const address = server.address();
        if (!address || typeof address === 'string') {
            throw new Error('Unable to resolve bound port');
        }
        port = address.port;
    });

    after(async () => {
        await ctx?.close();
    });

    it('rejects missing token', async () => {
        const res = await requestJson(port, '/auth/check');
        expect(res.status).toBe(401);
    });

    it('accepts configured bearer token', async () => {
        const res = await requestJson(port, '/auth/check', {
            authorization: 'Bearer secret-token'
        });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ ok: true });
    });

    it('rejects query token by default even when it matches bearer token', async () => {
        const res = await requestJson(port, '/auth/check?token=secret-token');
        expect(res.status).toBe(401);
    });

    it('accepts valid jwt bearer token', async () => {
        const token = await new JWTService().sign({ sub: 'user-1' }, { privateKey: 'jwt-secret', algorithm: 'HS256' });
        const res = await requestJson(port, '/auth/check', {
            authorization: `Bearer ${token}`
        });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ ok: true });
    });
});
