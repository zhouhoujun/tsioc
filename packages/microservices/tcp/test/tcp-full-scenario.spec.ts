import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import {
    Controller, Get, Post, Put, Delete,
    RequestHeader, RequestPath, RequestParam, RequestBody,
    provideService, withServiceRouter,
    composeMiddleware, MiddlewareFn
} from '@tsdi/service';
import { withTcpTransport, TcpServer } from '../src/server';
import expect = require('expect');

describe('TCP Microservice Full End-to-End Scenario', () => {

    describe('Complete controller with all parameter types', () => {
        interface User {
            id: string;
            name: string;
            email: string;
        }

        @Controller('/api/users')
        class UserController {
            @Get('/')
            list(
                @RequestParam('page') page: number = 1,
                @RequestParam('pageSize') pageSize: number = 20,
                @RequestParam('sort') sort: string = 'id',
                @RequestHeader('accept') accept: string
            ) {
                return {
                    page,
                    pageSize,
                    sort,
                    accept,
                    data: [] as User[]
                };
            }

            @Get('/:id')
            getById(
                @RequestPath('id') id: string,
                @RequestHeader('authorization') authorization?: string
            ) {
                return {
                    id,
                    authorization,
                    name: 'Test User',
                    email: 'test@example.com'
                };
            }

            @Post('/')
            create(
                @RequestBody() user: Omit<User, 'id'>
            ) {
                return {
                    id: 'new-123',
                    ...user
                };
            }

            @Put('/:id')
            update(
                @RequestPath('id') id: string,
                @RequestBody() updates: Partial<User>
            ) {
                return {
                    id,
                    ...updates
                };
            }

            @Delete('/:id')
            delete(
                @RequestPath('id') id: string
            ) {
                return {
                    deleted: true,
                    id
                };
            }
        }

        @Module({
            declarations: [UserController],
            providers: [
                ...provideService(
                    withServiceRouter(),
                    withTcpTransport({
                        listenOpts: { port: 0, host: '127.0.0.1' },
                        asDefault: true
                    })
                )
            ]
        })
        class UserApiModule { }

        it('should bootstrap application with complete controller', (done: Mocha.Done) => {
            const app = Application.run(UserApiModule);
            app
                .then((ctx: ApplicationContext) => {
                    try {
                        const tcpServer = ctx.get(TcpServer);
                        expect(tcpServer).toBeDefined();
                        expect(tcpServer instanceof TcpServer).toBe(true);

                        // Close after test
                        setTimeout(() => {
                            ctx.close().then(() => done());
                        }, 50);
                    } catch (err: unknown) {
                        ctx.close().then(() => done(err as Error));
                    }
                })
                .catch((err: unknown) => {
                    done(err as Error);
                });
        });

        it('should create providers for complete controller without errors', () => {
            const providers = provideService(
                withServiceRouter(),
                withTcpTransport({
                    listenOpts: { port: 0 },
                    asDefault: true
                })
            );
            expect(Array.isArray(providers)).toBe(true);
            expect(providers.length).toBeGreaterThan(0);
        });
    });

    describe('Middleware composition', () => {
        it('should compose middleware correctly', () => {
            const middleware1: MiddlewareFn = (_ctx, next) => {
                return next();
            };

            const composed = composeMiddleware([middleware1]);
            expect(composed).toBeDefined();
            expect(typeof composed).toBe('function');
        });
    });

    describe('Multiple controllers in one module', () => {
        @Controller('/api/first')
        class FirstController {
            @Get('/test')
            test() {
                return { controller: 'first' };
            }
        }

        @Controller('/api/second')
        class SecondController {
            @Get('/test')
            test() {
                return { controller: 'second' };
            }
        }

        @Module({
            declarations: [FirstController, SecondController],
            providers: [
                ...provideService(
                    withServiceRouter(),
                    withTcpTransport({
                        listenOpts: { port: 0 },
                        asDefault: true
                    })
                )
            ]
        })
        class MultiControllerModule { }

        it('should bootstrap with multiple controllers', (done: Mocha.Done) => {
            const app = Application.run(MultiControllerModule);
            app
                .then(ctx => {
                    try {
                        const tcpServer = ctx.get(TcpServer);
                        expect(tcpServer).toBeDefined();
                        ctx.close().then(() => done());
                    } catch (err: unknown) {
                        ctx.close().then(() => done(err as Error));
                    }
                });
        });
    });

    describe('TLS secured TCP server configuration', () => {
        it('should accept TLS server options', () => {
            // Just test that we can create the transport with TLS options
            const providers = provideService(
                withServiceRouter(),
                withTcpTransport({
                    listenOpts: { port: 0 },
                    serverOpts: {
                        // Just a test configuration, doesn't need real certs
                        requestCert: false,
                        rejectUnauthorized: false
                    },
                    asDefault: true
                })
            );

            expect(Array.isArray(providers)).toBe(true);
            expect(providers.length).toBeGreaterThan(0);
        });
    });

    describe('IPC / UNIX domain socket support', () => {
        it('should accept IPC path configuration', () => {
            const providers = provideService(
                withServiceRouter(),
                withTcpTransport({
                    listenOpts: { path: '/tmp/tcp-test.sock' },
                    asDefault: true
                })
            );

            expect(Array.isArray(providers)).toBe(true);
            expect(providers.length).toBeGreaterThan(0);
        });
    });
});
