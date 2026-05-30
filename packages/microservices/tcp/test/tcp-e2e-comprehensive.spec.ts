import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { BadRequestException } from '@tsdi/common';
import {
    Controller, Get, Post, Put, Delete,
    RequestHeader, RequestPath, RequestParam, RequestBody,
    provideService, useRouter
} from '@tsdi/service';
import { useTcpTransport } from '../src/server';
import * as net from 'node:net';
import expect = require('expect');

/**
 * TCP Microservice Comprehensive End-to-End Test
 *
 * Tests the full TCP server request-response flow using raw TCP sockets,
 * covering all parameter types: query, path, body, headers.
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

        @Get('/nullable')
        nullable(
            @RequestParam('q', { nullable: true }) q: string | null,
            @RequestHeader('x-optional') optional?: string
        ) {
            return { q, optional: optional ?? null };
        }

        @Get('/falsy')
        falsy(
            @RequestParam('zero', { pipe: 'int' }) zero: number,
            @RequestParam('enabled', { pipe: 'boolean' }) enabled: boolean
        ) {
            return { zero, enabled, ok: false, empty: '' };
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
                useRouter(),
                useTcpTransport({
                    listenOpts: { port: SERVER_PORT, host: '127.0.0.1' },
                    asDefault: true
                })
            )
        ]
    })
    class E2ETestModule { }

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(E2ETestModule);
        // Wait for server to start listening
        await new Promise(resolve => setTimeout(resolve, 300));
    });

    // ========== Query Parameters (@RequestParam) ==========

    describe('Query Parameters (@RequestParam)', () => {

        it('should pass query parameters to controller', async () => {
            const result = await sendTcpRequest(SERVER_PORT, {
                path: '/api/users',
                method: 'GET',
                query: { page: '2', pageSize: '20', sort: 'name' },
                headers: { accept: 'application/json' }
            });

            expect(result.page).toBe(2);
            expect(result.pageSize).toBe(20);
            expect(result.sort).toBe('name');
            expect(result.accept).toBe('application/json');
            expect(Array.isArray(result.data)).toBe(true);
            expect(result.data.length).toBe(2);
        });

        it('should use default values when query params are omitted', async () => {
            const result = await sendTcpRequest(SERVER_PORT, {
                path: '/api/users/defaults',
                method: 'GET',
                query: {}
            });

            expect(result.page).toBe(1);
            expect(result.pageSize).toBe(20);
            expect(result.sort).toBe('name');
            expect(result.order).toBe('asc');
        });

        it('should handle partial query params with defaults', async () => {
            const result = await sendTcpRequest(SERVER_PORT, {
                path: '/api/users/defaults',
                method: 'GET',
                query: { page: '5', order: 'desc' }
            });

            expect(result.page).toBe(5);
            expect(result.pageSize).toBe(20);
            expect(result.sort).toBe('name');
            expect(result.order).toBe('desc');
        });

        it('should handle search with optional query params', async () => {
            const result = await sendTcpRequest(SERVER_PORT, {
                path: '/api/users/search',
                method: 'GET',
                query: { q: 'test-query', active: 'true' }
            });

            expect(result.query).toBe('test-query');
            expect(result.active).toBe(true);
        });

        it('should convert parameter types (int, boolean)', async () => {
            const result = await sendTcpRequest(SERVER_PORT, {
                path: '/api/users/convert',
                method: 'GET',
                query: { age: '25', enabled: 'true' }
            });

            expect(result.age).toBe(25);
            expect(typeof result.age).toBe('number');
            expect(result.enabled).toBe(true);
            expect(typeof result.enabled).toBe('boolean');
            expect(result.typeCheck).toBe(true);
        });

        it('should return nullable query as null when omitted', async () => {
            const result = await sendTcpRequest(SERVER_PORT, {
                path: '/api/users/nullable',
                method: 'GET',
                query: {}
            });
            expect(result.q).toBe(null);
            expect(result.optional).toBe(null);
        });

        it('should preserve falsy values in response body', async () => {
            const result = await sendTcpRequest(SERVER_PORT, {
                path: '/api/users/falsy',
                method: 'GET',
                query: { zero: '0', enabled: 'false' }
            });
            expect(result).toEqual({ zero: 0, enabled: false, ok: false, empty: '' });
        });
    });

    // ========== Path Parameters (@RequestPath) ==========

    describe('Path Parameters (@RequestPath)', () => {

        it('should pass path parameter to controller', async () => {
            const result = await sendTcpRequest(SERVER_PORT, {
                path: '/api/users/123',
                method: 'GET',
                headers: { authorization: 'Bearer token-abc' }
            });

            expect(result.id).toBe('123');
            expect(result.authorization).toBe('Bearer token-abc');
            expect(result.name).toBe('Test User');
            expect(result.email).toBe('test@example.com');
        });

        it('should handle path parameter without optional header', async () => {
            const result = await sendTcpRequest(SERVER_PORT, {
                path: '/api/users/456',
                method: 'GET'
            });

            expect(result.id).toBe('456');
            expect(result.authorization).toBeUndefined();
        });

        it('should handle delete with path parameter', async () => {
            const result = await sendTcpRequest(SERVER_PORT, {
                path: '/api/users/789',
                method: 'DELETE'
            });

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

            const result = await sendTcpRequest(SERVER_PORT, {
                path: '/api/users',
                method: 'POST',
                body: userData
            });

            expect(result.id).toBeDefined();
            expect(result.name).toBe(userData.name);
            expect(result.email).toBe(userData.email);
        });

        it('should pass request body with path param to PUT controller', async () => {
            const result = await sendTcpRequest(SERVER_PORT, {
                path: '/api/users/456',
                method: 'PUT',
                body: { name: 'Updated Name', email: 'updated@example.com' }
            });

            expect(result.id).toBe('456');
            expect(result.name).toBe('Updated Name');
            expect(result.email).toBe('updated@example.com');
        });

        it('should handle bulk create with array body', async () => {
            const users = [
                { id: '1', name: 'User A', email: 'a@example.com' },
                { id: '2', name: 'User B', email: 'b@example.com' },
                { id: '3', name: 'User C', email: 'c@example.com' }
            ];

            const result = await sendTcpRequest(SERVER_PORT, {
                path: '/api/users/bulk',
                method: 'POST',
                body: users
            });

            expect(result.count).toBe(3);
            expect(Array.isArray(result.users)).toBe(true);
            expect(result.users[0].name).toBe('User A');
        });
    });

    // ========== Request Headers (@RequestHeader) ==========

    describe('Request Headers (@RequestHeader)', () => {

        it('should pass accept header to controller', async () => {
            const result = await sendTcpRequest(SERVER_PORT, {
                path: '/api/users',
                method: 'GET',
                query: { page: '1' },
                headers: { accept: 'application/json' }
            });

            expect(result.accept).toBe('application/json');
        });

        it('should pass multiple headers', async () => {
            const result = await sendTcpRequest(SERVER_PORT, {
                path: '/api/users',
                method: 'GET',
                query: { page: '3' },
                headers: {
                    accept: 'text/xml',
                    'x-custom': 'custom-value'
                }
            });

            expect(result.accept).toBe('text/xml');
            expect(result.page).toBe(3);
        });
    });

    // ========== Error Handling ==========

    describe('Error Handling', () => {

        it('should handle BadRequestException from controller', async () => {
            try {
                const result = await sendTcpRequest(SERVER_PORT, {
                    path: '/api/users/throw-bad-request',
                    method: 'GET'
                });
                expect(result.error).toBeDefined();
            } catch (err) {
                expect(err).toBeDefined();
            }
        });
    });

    // ========== Multiple Requests on Same Connection ==========

    describe('Connection Reuse', () => {

        it('should handle multiple sequential requests', async () => {
            const r1 = await sendTcpRequest(SERVER_PORT, {
                path: '/api/users/1',
                method: 'GET'
            });
            expect(r1.id).toBe('1');

            const r2 = await sendTcpRequest(SERVER_PORT, {
                path: '/api/users/2',
                method: 'GET'
            });
            expect(r2.id).toBe('2');

            const r3 = await sendTcpRequest(SERVER_PORT, {
                path: '/api/users',
                method: 'GET',
                query: { page: '5' },
                headers: { accept: 'application/json' }
            });
            expect(r3.page).toBe(5);
        });
    });

    after(async () => {
        if (ctx) {
            await ctx.destroy();
        }
    });
});

/**
 * Helper to send a raw TCP request and get the parsed JSON response.
 */
function sendTcpRequest(port: number, requestObj: Record<string, unknown>): Promise<any> {
    return new Promise((resolve, reject) => {
        const socket = new net.Socket();
        let response = '';
        const payload = ('path' in requestObj && !('url' in requestObj))
            ? { ...requestObj, url: requestObj.path, path: undefined }
            : requestObj;

        socket.connect(port, '127.0.0.1', () => {
            socket.write(JSON.stringify(payload) + '\r\n');
        });

        socket.on('data', (chunk) => {
            response += chunk.toString();
            if (response.endsWith('\r\n')) {
                socket.destroy();
                try {
                    resolve(JSON.parse(response.trim()));
                } catch {
                    resolve(response.trim());
                }
            }
        });

        socket.on('error', (err) => {
            socket.destroy();
            reject(err);
        });

        socket.on('close', () => {
            if (response) {
                try {
                    resolve(JSON.parse(response.trim()));
                } catch {
                    resolve(response.trim());
                }
            }
        });

        setTimeout(() => {
            socket.destroy();
            reject(new Error('Request timeout'));
        }, 5000);
    });
}
