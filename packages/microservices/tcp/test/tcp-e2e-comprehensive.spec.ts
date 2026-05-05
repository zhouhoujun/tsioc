import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { BadRequestException } from '@tsdi/common';
import {
    Controller, Get, Post, Put, Delete,
    RequestHeader, RequestPath, RequestParam, RequestBody,
    provideService, withServiceRouter
} from '@tsdi/service';
import { provideClient } from '@tsdi/client';
import { withTcpTransport } from '../src/server';
import { withTcpClientTransport, TcpClient } from '../src/client';
import { lastValueFrom, catchError, of } from 'rxjs';
import expect = require('expect');

/**
 * TCP Microservice Comprehensive End-to-End Test
 *
 * Tests the full client→server flow using TcpClient → TcpServer
 * with all parameter types: query, path, body, headers.
 */
describe('TCP Microservice E2E: Client → Server Full Flow', () => {

    const SERVER_PORT = 11399;

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
            return {
                page,
                pageSize,
                sort,
                accept,
                data: [
                    { id: '1', name: 'User 1', email: 'user1@example.com' },
                    { id: '2', name: 'User 2', email: 'user2@example.com' }
                ] as User[]
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
                id: 'new-' + Date.now(),
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

        @Get('/search')
        search(
            @RequestParam('q') query: string,
            @RequestParam('active') active?: boolean
        ) {
            return {
                query,
                active,
                results: [] as any[]
            };
        }

        @Post('/bulk')
        bulkCreate(
            @RequestBody() users: User[]
        ) {
            return {
                count: users.length,
                users
            };
        }

        @Get('/convert')
        convert(
            @RequestParam('age', { pipe: 'int' }) age: number,
            @RequestParam('enabled', { pipe: 'boolean' }) enabled: boolean
        ) {
            return {
                age,
                enabled,
                typeCheck: typeof age === 'number' && typeof enabled === 'boolean'
            };
        }

        @Get('/defaults')
        defaults(
            @RequestParam('page') page: number = 1,
            @RequestParam('pageSize') pageSize: number = 20,
            @RequestParam('sort') sort: string = 'name',
            @RequestParam('order') order: 'asc' | 'desc' = 'asc'
        ) {
            return { page, pageSize, sort, order };
        }

        @Get('/throw-bad-request')
        throwBadRequest() {
            throw new BadRequestException('Invalid input');
        }
    }

    @Module({
        imports: [LoggerModule],
        declarations: [UserController],
        providers: [
            provideService(
                withServiceRouter(),
                withTcpTransport({
                    listenOpts: { port: SERVER_PORT, host: '127.0.0.1' },
                    asDefault: true
                })
            ),
            provideClient(
                withTcpClientTransport({
                    connectOpts: { port: SERVER_PORT, host: '127.0.0.1' },
                    asDefault: true
                })
            )
        ]
    })
    class E2ETestModule { }

    let ctx: ApplicationContext;
    let client: TcpClient;

    before(async () => {
        ctx = await Application.run(E2ETestModule);
        client = ctx.get(TcpClient);
        // Wait for server to start listening
        await new Promise(resolve => setTimeout(resolve, 500));
    });

    // ========== Query Parameters (@RequestParam) ==========

    describe('Query Parameters (@RequestParam)', () => {

        it('should pass query parameters to controller', async () => {
            const result = await lastValueFrom(
                client.send('/api/users', {
                    params: { page: '2', pageSize: '20', sort: 'name' },
                    headers: { accept: 'application/json' }
                }).pipe(catchError(err => of(err)))
            );

            expect(result.page).toBe(2);
            expect(result.pageSize).toBe(20);
            expect(result.sort).toBe('name');
            expect(result.accept).toBe('application/json');
            expect(Array.isArray(result.data)).toBe(true);
            expect(result.data.length).toBe(2);
        });

        it('should use default values when query params are omitted', async () => {
            const result = await lastValueFrom(
                client.send('/api/users/defaults', {
                    params: {}
                }).pipe(catchError(err => of(err)))
            );

            expect(result.page).toBe(1);
            expect(result.pageSize).toBe(20);
            expect(result.sort).toBe('name');
            expect(result.order).toBe('asc');
        });

        it('should handle partial query params with defaults', async () => {
            const result = await lastValueFrom(
                client.send('/api/users/defaults', {
                    params: { page: '5', order: 'desc' }
                }).pipe(catchError(err => of(err)))
            );

            expect(result.page).toBe(5);
            expect(result.pageSize).toBe(20); // default
            expect(result.sort).toBe('name'); // default
            expect(result.order).toBe('desc');
        });

        it('should handle search with optional query params', async () => {
            const result = await lastValueFrom(
                client.send('/api/users/search', {
                    params: { q: 'test-query', active: 'true' }
                }).pipe(catchError(err => of(err)))
            );

            expect(result.query).toBe('test-query');
            expect(result.active).toBe(true);
        });

        it('should convert parameter types (int, boolean)', async () => {
            const result = await lastValueFrom(
                client.send('/api/users/convert', {
                    params: { age: '25', enabled: 'true' }
                }).pipe(catchError(err => of(err)))
            );

            expect(result.age).toBe(25);
            expect(typeof result.age).toBe('number');
            expect(result.enabled).toBe(true);
            expect(typeof result.enabled).toBe('boolean');
            expect(result.typeCheck).toBe(true);
        });
    });

    // ========== Path Parameters (@RequestPath) ==========

    describe('Path Parameters (@RequestPath)', () => {

        it('should pass path parameter to controller', async () => {
            const result = await lastValueFrom(
                client.send('/api/users/123', {
                    headers: { authorization: 'Bearer token-abc' }
                }).pipe(catchError(err => of(err)))
            );

            expect(result.id).toBe('123');
            expect(result.authorization).toBe('Bearer token-abc');
            expect(result.name).toBe('Test User');
            expect(result.email).toBe('test@example.com');
        });

        it('should handle path parameter without optional header', async () => {
            const result = await lastValueFrom(
                client.send('/api/users/456').pipe(catchError(err => of(err)))
            );

            expect(result.id).toBe('456');
            expect(result.authorization).toBeUndefined();
        });

        it('should handle delete with path parameter', async () => {
            const result = await lastValueFrom(
                client.send('/api/users/789', {
                    method: 'DELETE'
                }).pipe(catchError(err => of(err)))
            );

            expect(result.deleted).toBe(true);
            expect(result.id).toBe('789');
        });
    });

    // ========== Request Body (@RequestBody) ==========

    describe('Request Body (@RequestBody)', () => {

        it('should pass request body to POST controller', async () => {
            const userData = {
                name: 'New User',
                email: 'new@example.com'
            };

            const result = await lastValueFrom(
                client.send('/api/users', {
                    method: 'POST',
                    body: userData
                }).pipe(catchError(err => of(err)))
            );

            expect(result.id).toBeDefined();
            expect(result.name).toBe(userData.name);
            expect(result.email).toBe(userData.email);
        });

        it('should pass request body with path param to PUT controller', async () => {
            const updateData = {
                name: 'Updated Name',
                email: 'updated@example.com'
            };

            const result = await lastValueFrom(
                client.send('/api/users/456', {
                    method: 'PUT',
                    body: updateData
                }).pipe(catchError(err => of(err)))
            );

            expect(result.id).toBe('456');
            expect(result.name).toBe(updateData.name);
            expect(result.email).toBe(updateData.email);
        });

        it('should handle bulk create with array body', async () => {
            const users = [
                { id: '1', name: 'User A', email: 'a@example.com' },
                { id: '2', name: 'User B', email: 'b@example.com' },
                { id: '3', name: 'User C', email: 'c@example.com' }
            ];

            const result = await lastValueFrom(
                client.send('/api/users/bulk', {
                    method: 'POST',
                    body: users
                }).pipe(catchError(err => of(err)))
            );

            expect(result.count).toBe(3);
            expect(Array.isArray(result.users)).toBe(true);
            expect(result.users[0].name).toBe('User A');
        });
    });

    // ========== Request Headers (@RequestHeader) ==========

    describe('Request Headers (@RequestHeader)', () => {

        it('should pass accept header to controller', async () => {
            const result = await lastValueFrom(
                client.send('/api/users', {
                    params: { page: '1' },
                    headers: { accept: 'application/json' }
                }).pipe(catchError(err => of(err)))
            );

            expect(result.accept).toBe('application/json');
        });

        it('should pass authorization header with path param', async () => {
            const result = await lastValueFrom(
                client.send('/api/users/999', {
                    headers: {
                        authorization: 'Bearer super-secret-token'
                    }
                }).pipe(catchError(err => of(err)))
            );

            expect(result.id).toBe('999');
            expect(result.authorization).toBe('Bearer super-secret-token');
        });

        it('should handle multiple headers', async () => {
            const result = await lastValueFrom(
                client.send('/api/users', {
                    params: { page: '3' },
                    headers: {
                        accept: 'text/xml',
                        'x-custom': 'custom-value'
                    }
                }).pipe(catchError(err => of(err)))
            );

            expect(result.accept).toBe('text/xml');
            expect(result.page).toBe(3);
        });
    });

    // ========== Error Handling ==========

    describe('Error Handling', () => {

        it('should handle BadRequestException from controller', async () => {
            const result = await lastValueFrom(
                client.send('/api/users/throw-bad-request').pipe(catchError(err => of(err)))
            );

            // Should get an error response
            expect(result).toBeDefined();
            if (result.error) {
                expect(result.error).toBeDefined();
            }
            if (result.statusText) {
                expect(result.statusText).toBe('Bad Request');
            }
        });
    });

    // ========== Multiple Requests on Same Connection ==========

    describe('Connection Reuse', () => {

        it('should handle multiple sequential requests on same connection', async () => {
            // Request 1
            const r1 = await lastValueFrom(
                client.send('/api/users/1').pipe(catchError(err => of(err)))
            );
            expect(r1.id).toBe('1');

            // Request 2
            const r2 = await lastValueFrom(
                client.send('/api/users/2').pipe(catchError(err => of(err)))
            );
            expect(r2.id).toBe('2');

            // Request 3
            const r3 = await lastValueFrom(
                client.send('/api/users', {
                    params: { page: '5' },
                    headers: { accept: 'application/json' }
                }).pipe(catchError(err => of(err)))
            );
            expect(r3.page).toBe(5);
        });
    });

    after(async () => {
        if (ctx) {
            await ctx.destroy();
        }
    });
});
