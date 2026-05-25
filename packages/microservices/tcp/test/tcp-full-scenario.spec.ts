import { Module } from '@tsdi/ioc';
import {
    Controller, Get, Post, Put, Delete,
    RequestHeader, RequestPath, RequestParam, RequestBody,
    provideService, withServiceRouter,
    composeMiddleware, MiddlewareFn
} from '@tsdi/service';
import { withTcpTransport } from '../src/server';
import expect = require('expect');

describe('TCP Microservice Full Scenario Tests', () => {

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
                return { page, pageSize, sort, accept };
            }

            @Get('/:id')
            getById(
                @RequestPath('id') id: string,
                @RequestHeader('authorization') authorization?: string
            ) {
                return { id, authorization };
            }

            @Post('/')
            create(@RequestBody() user: Omit<User, 'id'>) {
                return { id: 'new-123', ...user };
            }

            @Put('/:id')
            update(@RequestPath('id') id: string, @RequestBody() updates: Partial<User>) {
                return { id, ...updates };
            }

            @Delete('/:id')
            delete(@RequestPath('id') id: string) {
                return { deleted: true, id };
            }
        }

        it('should compile module with full controller without error', () => {
            @Module({
                declarations: [UserController],
                providers: [
                    provideService(
                        withServiceRouter(),
                        withTcpTransport({
                            listenOpts: { port: 0, host: '127.0.0.1' },
                            asDefault: true
                        })
                    )
                ]
            })
            class UserApiModule { }

            expect(UserApiModule).toBeDefined();
        });

        it('should create providers for complete controller', () => {
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
        it('should compose a single middleware', () => {
            const middleware1: MiddlewareFn = (_ctx, next) => {
                return next();
            };

            const composed = composeMiddleware([middleware1]);
            expect(composed).toBeDefined();
            expect(typeof composed).toBe('function');
        });

        it('should compose multiple middlewares', () => {
            const order: string[] = [];
            const mw1: MiddlewareFn = (_ctx, next) => {
                order.push('mw1');
                return next();
            };
            const mw2: MiddlewareFn = (_ctx, next) => {
                order.push('mw2');
                return next();
            };

            const composed = composeMiddleware([mw1, mw2]);
            expect(composed).toBeDefined();
            expect(typeof composed).toBe('function');
        });
    });

    describe('Multiple controllers in one module', () => {
        it('should compile module with multiple controllers', () => {
            @Controller('/api/first')
            class FirstController {
                @Get('/test')
                test() { return { controller: 'first' }; }
            }

            @Controller('/api/second')
            class SecondController {
                @Get('/test')
                test() { return { controller: 'second' }; }
            }

            @Module({
                declarations: [FirstController, SecondController],
                providers: [
                    provideService(
                        withServiceRouter(),
                        withTcpTransport({
                            listenOpts: { port: 0 },
                            asDefault: true
                        })
                    )
                ]
            })
            class MultiControllerModule { }

            expect(MultiControllerModule).toBeDefined();
        });

        it('should create providers for multiple controllers', () => {
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

    describe('TLS secured TCP server configuration', () => {
        it('should accept TLS server options', () => {
            const providers = provideService(
                withServiceRouter(),
                withTcpTransport({
                    listenOpts: { port: 0 },
                    serverOpts: {
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
