import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { provideService, withCors, withServiceRouter, withServiceInterceptors, SERVICE_CORS_OPTIONS } from '@tsdi/service';
import { withHttpTransport } from '../src/server';
import { withHttpClientTransport } from '../src/client';
import { provideClient } from '@tsdi/client';
import { HelmetMiddleware, HelmetOptions } from '../src/server/interceptors/helmet';
import { Cors, CorsOptions } from '../src/server/interceptors/cors';
import { CorsTestModule } from './demo';
import * as http from 'node:http';
import expect = require('expect');

const CORS_PORT = 21310;
const HELMET_PORT = 21311;

describe('HTTP Security', () => {
    describe('CORS Interceptor', () => {
        @Module({
            imports: [LoggerModule, CorsTestModule],
            providers: [
                provideService(
                    withServiceRouter(),
                    withCors({
                        origin: '*',
                        allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH',
                        credentials: false
                    }),
                    withHttpTransport({ listenOpts: { port: CORS_PORT, host: '127.0.0.1' }, asDefault: true })),
                provideClient(
                    withHttpClientTransport({ url: `http://127.0.0.1:${CORS_PORT}`, asDefault: true }))
            ]
        })
        class CorsApp { }

        let ctx: ApplicationContext;

        before(async () => {
            ctx = await Application.run(CorsApp);
            await new Promise(r => setTimeout(r, 500));
        });

        after(async () => {
            await ctx?.close();
        });

        it('should set CORS headers on simple request', async () => {
            const res = await new Promise<http.IncomingMessage>((resolve) => {
                http.request({
                    host: '127.0.0.1', port: CORS_PORT, path: '/api/cors-test/info', method: 'GET',
                    headers: { 'origin': 'http://example.com' }
                }, resolve).end();
            });
            expect(res.headers['access-control-allow-origin']).toBe('*');
        });

        it('should handle CORS preflight OPTIONS', async () => {
            const res = await new Promise<http.IncomingMessage>((resolve) => {
                http.request({
                    host: '127.0.0.1', port: CORS_PORT, path: '/api/cors-test/data', method: 'OPTIONS',
                    headers: {
                        'origin': 'http://example.com',
                        'access-control-request-method': 'POST'
                    }
                }, resolve).end();
            });
            expect(res.statusCode).toBe(204);
            expect(res.headers['access-control-allow-origin']).toBe('*');
            expect(res.headers['access-control-allow-methods']).toBeDefined();
        });

        it('should not set CORS headers when no origin', async () => {
            const res = await new Promise<http.IncomingMessage>((resolve) => {
                http.request({
                    host: '127.0.0.1', port: CORS_PORT, path: '/api/cors-test/info', method: 'GET'
                }, resolve).end();
            });
            expect(res.headers['access-control-allow-origin']).toBeUndefined();
        });

        it('should keep supporting shared service CORS options token', async () => {
            const resolved = ctx.get<any>(SERVICE_CORS_OPTIONS as any);
            expect(resolved.origin).toBe('*');
            expect(resolved.allowMethods).toBe('GET,HEAD,PUT,POST,DELETE,PATCH');
        });
    });

    describe('CORS credentials origin guard', () => {
        const CREDENTIALS_PORT = 21313;

        @Module({
            imports: [LoggerModule, CorsTestModule],
            providers: [
                provideService(
                    withServiceRouter(),
                    withCors({
                        credentials: true
                    }),
                    withHttpTransport({ listenOpts: { port: CREDENTIALS_PORT, host: '127.0.0.1' }, asDefault: true })),
                provideClient(
                    withHttpClientTransport({ url: `http://127.0.0.1:${CREDENTIALS_PORT}`, asDefault: true }))
            ]
        })
        class CredentialsCorsApp { }

        let ctx: ApplicationContext;

        before(async () => {
            ctx = await Application.run(CredentialsCorsApp);
            await new Promise(r => setTimeout(r, 500));
        });

        after(async () => {
            await ctx?.close();
        });

        it('should not reflect arbitrary origins when credentials are enabled without allowlist', async () => {
            const res = await new Promise<http.IncomingMessage>((resolve) => {
                http.request({
                    host: '127.0.0.1', port: CREDENTIALS_PORT, path: '/api/cors-test/info', method: 'GET',
                    headers: { 'origin': 'http://attacker.example.com' }
                }, resolve).end();
            });
            expect(res.headers['access-control-allow-origin']).toBeUndefined();
            expect(res.headers['access-control-allow-credentials']).toBeUndefined();
        });
    });

    describe('CORS legacy options injection', () => {
        const LEGACY_PORT = 21312;

        @Module({
            imports: [LoggerModule, CorsTestModule],
            providers: [
                {
                    provide: CorsOptions,
                    useValue: {
                        origin: 'http://legacy.example.com',
                        allowMethods: 'GET,POST'
                    } as CorsOptions
                },
                provideService(
                    withServiceRouter(),
                    withServiceInterceptors(Cors),
                    withHttpTransport({ listenOpts: { port: LEGACY_PORT, host: '127.0.0.1' }, asDefault: true })),
                provideClient(
                    withHttpClientTransport({ url: `http://127.0.0.1:${LEGACY_PORT}`, asDefault: true }))
            ]
        })
        class LegacyCorsApp { }

        let ctx: ApplicationContext;

        before(async () => {
            ctx = await Application.run(LegacyCorsApp);
            await new Promise(r => setTimeout(r, 500));
        });

        after(async () => {
            await ctx?.close();
        });

        it('should keep supporting manual CorsOptions provider', async () => {
            const res = await new Promise<http.IncomingMessage>((resolve) => {
                http.request({
                    host: '127.0.0.1', port: LEGACY_PORT, path: '/api/cors-test/info', method: 'GET',
                    headers: { 'origin': 'http://legacy.example.com' }
                }, resolve).end();
            });
            expect(res.headers['access-control-allow-origin']).toBe('http://legacy.example.com');
        });
    });

    describe('Helmet Interceptor', () => {
        @Module({
            imports: [LoggerModule, CorsTestModule],
            providers: [
                {
                    provide: HelmetOptions,
                    useValue: {
                        dnsPrefetch: 'off' as const,
                        xPoweredBy: '',
                        maxAge: 180 * 24 * 60 * 60,
                        allowDns: 'off' as const,
                        includeSubDomains: false,
                        preload: false,
                        xFrame: { action: 'SAMEORIGIN' as const },
                        xssProtection: {}
                    } as HelmetOptions
                },
                provideService(
                    withServiceRouter(),
                    withServiceInterceptors(HelmetMiddleware),
                    withHttpTransport({ listenOpts: { port: HELMET_PORT, host: '127.0.0.1' }, asDefault: true })),
                provideClient(
                    withHttpClientTransport({ url: `http://127.0.0.1:${HELMET_PORT}`, asDefault: true }))
            ]
        })
        class HelmetApp { }

        let ctx: ApplicationContext;

        before(async () => {
            ctx = await Application.run(HelmetApp);
            await new Promise(r => setTimeout(r, 500));
        });

        after(async () => {
            await ctx?.close();
        });

        it('should set X-DNS-Prefetch-Control header', async () => {
            const res = await new Promise<http.IncomingMessage>((resolve) => {
                http.request({
                    host: '127.0.0.1', port: HELMET_PORT, path: '/api/cors-test/info', method: 'GET'
                }, resolve).end();
            });
            expect(res.headers['x-dns-prefetch-control']).toBe('off');
        });

        it('should set X-Frame-Options header', async () => {
            const res = await new Promise<http.IncomingMessage>((resolve) => {
                http.request({
                    host: '127.0.0.1', port: HELMET_PORT, path: '/api/cors-test/info', method: 'GET'
                }, resolve).end();
            });
            expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
        });

        it('should set X-Content-Type-Options header', async () => {
            const res = await new Promise<http.IncomingMessage>((resolve) => {
                http.request({
                    host: '127.0.0.1', port: HELMET_PORT, path: '/api/cors-test/info', method: 'GET'
                }, resolve).end();
            });
            expect(res.headers['x-content-type-options']).toBe('nosniff');
        });

        it('should set Strict-Transport-Security header', async () => {
            const res = await new Promise<http.IncomingMessage>((resolve) => {
                http.request({
                    host: '127.0.0.1', port: HELMET_PORT, path: '/api/cors-test/info', method: 'GET'
                }, resolve).end();
            });
            expect(res.headers['strict-transport-security']).toBeDefined();
        });
    });
});
