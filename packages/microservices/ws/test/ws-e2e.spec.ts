import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { BadRequestException } from '@tsdi/common';
import { provideService, withServiceFeatures, Controller, Get, Post, Put, Delete, RequestHeader, RequestPath, RequestParam, RequestBody } from '@tsdi/service';
import { withWsTransport } from '../src/server';
import { WebSocket } from 'ws';
import expect = require('expect');

describe('WebSocket Microservice End-to-End Request-Response Test', () => {

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
                results: []
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

        @Get('/throw-bad-request')
        throwBadRequest() {
            throw new BadRequestException('Invalid input');
        }
    }

    @Module({
        imports: [LoggerModule],
        declarations: [UserController],
        providers: [
            ...provideService(
                withServiceFeatures({ router: true }),
                withWsTransport({
                    listenOpts: { port: 11500, host: '127.0.0.1' },
                    asDefault: true
                })
            )
        ]
    })
    class UserApiModule { }

    const SERVER_PORT = 11500;

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(UserApiModule);
        // Wait for server to start listening
        await new Promise(resolve => setTimeout(resolve, 500));
    });

    it('should GET user list with query parameters', async () => {
        const request = JSON.stringify({
            path: '/api/users',
            method: 'GET',
            query: { page: '2', pageSize: '20', sort: 'name' },
            headers: { accept: 'application/json' }
        });

        const response = await sendWsRequest(SERVER_PORT, request);
        expect(response.page).toBe(2);
        expect(response.pageSize).toBe(20);
        expect(response.sort).toBe('name');
        expect(response.accept).toBe('application/json');
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.data.length).toBe(2);
    });

    it('should GET user list with default query parameters', async () => {
        const request = JSON.stringify({
            path: '/api/users',
            method: 'GET',
            query: {},
            headers: { accept: 'application/json' }
        });

        const response = await sendWsRequest(SERVER_PORT, request);
        expect(response.page).toBe(1);
        expect(response.pageSize).toBe(10);
        expect(response.sort).toBe('id');
    });

    it('should GET user by path parameter', async () => {
        const request = JSON.stringify({
            path: '/api/users/123',
            method: 'GET',
            headers: { authorization: 'Bearer token123' }
        });

        const response = await sendWsRequest(SERVER_PORT, request);
        expect(response.id).toBe('123');
        expect(response.authorization).toBe('Bearer token123');
        expect(response.name).toBe('Test User');
    });

    it('should POST create new user with request body', async () => {
        const userData = {
            name: 'New User',
            email: 'new@example.com'
        };

        const request = JSON.stringify({
            path: '/api/users',
            method: 'POST',
            body: userData
        });

        const response = await sendWsRequest(SERVER_PORT, request);
        expect(response.id).toBeDefined();
        expect(response.name).toBe(userData.name);
        expect(response.email).toBe(userData.email);
    });

    it('should PUT update user with path and body', async () => {
        const updateData = {
            name: 'Updated User',
            email: 'updated@example.com'
        };

        const request = JSON.stringify({
            path: '/api/users/456',
            method: 'PUT',
            body: updateData
        });

        const response = await sendWsRequest(SERVER_PORT, request);
        expect(response.id).toBe('456');
        expect(response.name).toBe(updateData.name);
        expect(response.email).toBe(updateData.email);
    });

    it('should DELETE user by path', async () => {
        const request = JSON.stringify({
            path: '/api/users/789',
            method: 'DELETE'
        });

        const response = await sendWsRequest(SERVER_PORT, request);
        expect(response.deleted).toBe(true);
        expect(response.id).toBe('789');
    });

    it('should handle search with optional query parameter', async () => {
        const request = JSON.stringify({
            path: '/api/users/search',
            method: 'GET',
            query: { q: 'test', active: 'true' }
        });

        const response = await sendWsRequest(SERVER_PORT, request);
        expect(response.query).toBe('test');
        expect(response.active).toBe(true);
    });

    it('should handle bulk create with array body', async () => {
        const users = [
            { id: '1', name: 'User 1', email: 'user1@example.com' },
            { id: '2', name: 'User 2', email: 'user2@example.com' }
        ];

        const request = JSON.stringify({
            path: '/api/users/bulk',
            method: 'POST',
            body: users
        });

        const response = await sendWsRequest(SERVER_PORT, request);
        expect(response.count).toBe(2);
        expect(Array.isArray(response.users)).toBe(true);
    });

    it('should convert parameter types', async () => {
        const request = JSON.stringify({
            path: '/api/users/convert',
            method: 'GET',
            query: { age: '25', enabled: 'true' }
        });

        const response = await sendWsRequest(SERVER_PORT, request);
        expect(response.age).toBe(25);
        expect(typeof response.age).toBe('number');
        expect(response.enabled).toBe(true);
        expect(typeof response.enabled).toBe('boolean');
        expect(response.typeCheck).toBe(true);
    });

    after(async () => {
        if (ctx) {
            await ctx.close();
        }
    });
});

/**
 * Helper to send a raw WebSocket request and get response
 * 发送原始 WebSocket 请求并获取响应的辅助函数
 */
function sendWsRequest(port: number, data: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(`ws://127.0.0.1:${port}`);

        ws.on('open', () => {
            ws.send(data);
        });

        ws.on('message', (chunk) => {
            try {
                const response = chunk.toString();
                const result = JSON.parse(response);
                ws.close();
                resolve(result);
            } catch (err) {
                ws.close();
                reject(err);
            }
        });

        ws.on('error', (err) => {
            ws.close();
            reject(err);
        });

        // Timeout
        setTimeout(() => {
            ws.close();
            reject(new Error('Request timeout'));
        }, 10000);
    });
}
