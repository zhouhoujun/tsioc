import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { Controller, Get, provideService, useAuth, useCors, useInterceptors, useRouter, SERVICE_CORS_OPTIONS } from '@tsdi/service';
import { httpTransportFactory, useHttpTransport } from '../src/server';
import { HTTP_AUTH_OPTIONS } from '../src/server/interceptors/auth';
import { withHttpTransport } from '../src/client';
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
                    useRouter(),
                    useCors({
                        origin: '*',
                        allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH',
                        credentials: false
                    }),
                    useHttpTransport({ listenOpts: { port: CORS_PORT, host: '127.0.0.1' }, asDefault: true })),
                provideClient(
                    withHttpTransport({ url: `http://127.0.0.1:${CORS_PORT}`, asDefault: true }))
            ]
        })
        class CorsApp { }

        let ctx: ApplicationContext;

        before(async () => {
            ctx = await Application.run(CorsApp);
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
            const resolved = ctx.get(SERVICE_CORS_OPTIONS);
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
                    useRouter(),
                    useCors({
                        credentials: true
                    }),
                    useHttpTransport({ listenOpts: { port: CREDENTIALS_PORT, host: '127.0.0.1' }, asDefault: true })),
                provideClient(
                    withHttpTransport({ url: `http://127.0.0.1:${CREDENTIALS_PORT}`, asDefault: true }))
            ]
        })
        class CredentialsCorsApp { }

        let ctx: ApplicationContext;

        before(async () => {
            ctx = await Application.run(CredentialsCorsApp);
            
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
                    useRouter(),
                    useInterceptors(Cors),
                    useHttpTransport({ listenOpts: { port: LEGACY_PORT, host: '127.0.0.1' }, asDefault: true })),
                provideClient(
                    withHttpTransport({ url: `http://127.0.0.1:${LEGACY_PORT}`, asDefault: true }))
            ]
        })
        class LegacyCorsApp { }

        let ctx: ApplicationContext;

        before(async () => {
            ctx = await Application.run(LegacyCorsApp);
            
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

    describe('HTTP Auth Interceptor', () => {
        const AUTH_PORT = 21314;

        @Controller('/api/auth-test')
        class AuthController {
            @Get('/auth')
            auth() {
                return { ok: true };
            }
        }

        @Module({
            imports: [LoggerModule],
            declarations: [AuthController],
            providers: [
                provideService(
                    useRouter(),
                    useAuth({ bearerToken: 'secret-token' }),
                    useHttpTransport({ listenOpts: { port: AUTH_PORT, host: '127.0.0.1' }, asDefault: true })
                ),
                provideClient(
                    withHttpTransport({ url: `http://127.0.0.1:${AUTH_PORT}`, asDefault: true })
                )
            ]
        })
        class AuthApp { }

        let ctx: ApplicationContext;

        before(async () => {
            ctx = await Application.run(AuthApp);
        });

        after(async () => {
            await ctx?.close();
        });

        it('should reject missing bearer token', async () => {
            const res = await new Promise<http.IncomingMessage>((resolve) => {
                http.request({
                    host: '127.0.0.1', port: AUTH_PORT, path: '/api/auth-test/auth', method: 'GET'
                }, resolve).end();
            });
            expect(res.statusCode).toBe(401);
        });

        it('should accept configured bearer token', async () => {
            const body = await new Promise<string>((resolve, reject) => {
                const req = http.request({
                    host: '127.0.0.1', port: AUTH_PORT, path: '/api/auth-test/auth', method: 'GET',
                    headers: { authorization: 'Bearer secret-token' }
                }, (res) => {
                    let text = '';
                    res.setEncoding('utf8');
                    res.on('data', chunk => text += chunk);
                    res.on('end', () => {
                        expect(res.statusCode).toBe(200);
                        resolve(text);
                    });
                });
                req.on('error', reject);
                req.end();
            });
            expect(JSON.parse(body)).toEqual({ ok: true });
        });

        it('should reject query token by default even when bearer auth is configured', async () => {
            const res = await new Promise<http.IncomingMessage>((resolve) => {
                http.request({
                    host: '127.0.0.1', port: AUTH_PORT, path: '/api/auth-test/auth?token=secret-token', method: 'GET'
                }, resolve).end();
            });
            expect(res.statusCode).toBe(401);
        });

        it('should fail closed when auth feature is enabled without a strategy', async () => {
            const BROKEN_AUTH_PORT = 21316;
            @Controller('/api/auth-test')
            class BrokenAuthController {
                @Get('/auth')
                auth() {
                    return { ok: true };
                }
            }
            @Module({
                imports: [LoggerModule],
                declarations: [BrokenAuthController],
                providers: [
                    provideService(
                        useRouter(),
                        useAuth(true),
                        useHttpTransport({ listenOpts: { port: BROKEN_AUTH_PORT, host: '127.0.0.1' }, asDefault: true })
                    )
                ]
            })
            class BrokenAuthApp { }

            const brokenCtx = await Application.run(BrokenAuthApp);
            try {
                const res = await new Promise<http.IncomingMessage>((resolve) => {
                    http.request({
                        host: '127.0.0.1', port: BROKEN_AUTH_PORT, path: '/api/auth-test/auth', method: 'GET'
                    }, resolve).end();
                });
                expect(res.statusCode).toBe(500);
            } finally {
                await brokenCtx.close();
            }
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
                    useRouter(),
                    useInterceptors(HelmetMiddleware),
                    useHttpTransport({ listenOpts: { port: HELMET_PORT, host: '127.0.0.1' }, asDefault: true })),
                provideClient(
                    withHttpTransport({ url: `http://127.0.0.1:${HELMET_PORT}`, asDefault: true }))
            ]
        })
        class HelmetApp { }

        let ctx: ApplicationContext;

        before(async () => {
            ctx = await Application.run(HelmetApp);
            
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
