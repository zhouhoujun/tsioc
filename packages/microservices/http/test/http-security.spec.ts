import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { provideService, withServiceRouter, withServiceInterceptors } from '@tsdi/service';
import { withHttpTransport } from '../src/server';
import { withHttpClientTransport } from '../src/client';
import { provideClient } from '@tsdi/client';
import { Cors, CorsOptions } from '../src/server/interceptors/cors';
import { HelmetMiddleware, HelmetOptions } from '../src/server/interceptors/helmet';
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
                {
                    provide: CorsOptions,
                    useValue: {
                        origin: '*',
                        allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH',
                        credentials: false
                    } as CorsOptions
                },
                provideService(
                    withServiceRouter(),
                    withServiceInterceptors(Cors),
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
            expect(res.statusCode).toBe(200);
            expect(res.headers['access-control-allow-origin']).toBeUndefined();
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
