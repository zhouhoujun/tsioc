import { Module } from '@tsdi/ioc';
import { Controller, Get, Post, Put, Delete, RequestHeader, RequestPath, RequestParam, RequestBody, provideService, useRouter } from '@tsdi/service';
import { provideClient } from '@tsdi/client';
import { useTcpTransport } from '../src/server';
import { withTcpTransport, TcpClient } from '../src/client';
import expect = require('expect');

describe('TCP Microservice Client Configuration Tests', () => {

    interface User {
        id: string;
        name: string;
        email: string;
        age?: number;
    }

    @Controller('/api/users')
    class UserController {

        @Get('/')
        list(
            @RequestParam('page') page: number = 1,
            @RequestParam('pageSize') pageSize: number = 10,
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
            return { id: 'new', ...user };
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

    describe('Server + Client Module Compilation', () => {

        it('should compile module with server and client transports', () => {
            @Module({
                declarations: [UserController],
                providers: [
                    provideService(
                        useRouter(),
                        useTcpTransport({
                            listenOpts: { port: 0, host: '127.0.0.1' },
                        })
                    ),
                    provideClient(
                        withTcpTransport({
                            connectOpts: { port: 0, host: '127.0.0.1' },
                        })
                    )
                ]
            })
            class UserApiModule { }

            expect(UserApiModule).toBeDefined();
        });

        it('should create valid server and client providers', () => {
            const serverProviders = provideService(
                useRouter(),
                useTcpTransport({
                    listenOpts: { port: 0, host: '127.0.0.1' },
                })
            );
            expect(Array.isArray(serverProviders)).toBe(true);
            expect(serverProviders.length).toBeGreaterThan(0);

            const clientProviders = provideClient(
                withTcpTransport({
                    connectOpts: { port: 0, host: '127.0.0.1' },
                })
            );
            expect(Array.isArray(clientProviders)).toBe(true);
            expect(clientProviders.length).toBeGreaterThan(0);
        });
    });

    describe('TcpClient import', () => {
        it('should be importable', () => {
            expect(TcpClient).toBeDefined();
            expect(typeof TcpClient).toBe('function');
        });
    });

    describe('Controller with HTTP methods', () => {
        it('should define all HTTP method decorators on controller', () => {
            @Controller('/api/items')
            class ItemController {
                @Get('/:id')
                get(@RequestPath('id') id: string) { return { id }; }

                @Post('/')
                create(@RequestBody() data: any) { return data; }

                @Put('/:id')
                update(@RequestPath('id') id: string, @RequestBody() data: any) { return { id, ...data }; }

                @Delete('/:id')
                remove(@RequestPath('id') id: string) { return { id, deleted: true }; }
            }

            expect(ItemController).toBeDefined();
        });
    });
});
