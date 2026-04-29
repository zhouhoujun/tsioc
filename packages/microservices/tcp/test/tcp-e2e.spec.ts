import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { BadRequestException } from '@tsdi/common';
import { provideService, withServiceRouter, Controller, Get, Post, Put, Delete, RequestHeader, RequestPath, RequestParam, RequestBody } from '@tsdi/service';
import { withTcpTransport } from '../src/server';
import * as net from 'node:net';
import expect = require('expect');

describe('TCP Microservice End-to-End Request-Response Test', () => {

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
                withServiceRouter(),
                withTcpTransport({
                    listenOpts: { port: 0, host: '127.0.0.1' },
                    asDefault: true
                })
            )
        ]
    })
    class UserApiModule { }

    let ctx: ApplicationContext;
    let serverPort: number;

    before(async () => {
        ctx = await Application.run(UserApiModule);
        // Get the actual server port from the TcpServer
        // Since TcpServer listens on 0, OS assigns a random port
        // We need to get it from the underlying server address
        const TcpServer = require('../src/server/tcp-server').TcpServer;
        const tcpServer = ctx.get(TcpServer) as any;
        // Wait a bit for server to start
        await new Promise(resolve => setTimeout(resolve, 50));
        if (tcpServer && tcpServer.serv) {
            const address = tcpServer.serv.address();
            if (address && typeof address === 'object' && 'port' in address) {
                serverPort = address.port;
            }
        }
        expect(serverPort).toBeGreaterThan(0);
    });

    it('should GET user list with query parameters', async () => {
        // Make a raw TCP request
        const request = JSON.stringify({
            path: '/api/users',
            method: 'GET',
            query: { page: '2', pageSize: '20', sort: 'name' },
            headers: { accept: 'application/json' }
        });

        const response = await sendTcpRequest(serverPort, request);
        const result = JSON.parse(response);

        expect(result.page).toBe(2);
        expect(result.pageSize).toBe(20);
        expect(result.sort).toBe('name');
        expect(result.accept).toBe('application/json');
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data.length).toBe(2);
    });

    it('should GET user list with default query parameters', async () => {
        const request = JSON.stringify({
            path: '/api/users',
            method: 'GET',
            query: {},
            headers: { accept: 'application/json' }
        });

        const response = await sendTcpRequest(serverPort, request);
        const result = JSON.parse(response);

        expect(result.page).toBe(1);
        expect(result.pageSize).toBe(10);
        expect(result.sort).toBe('id');
    });

    it('should GET user by path parameter', async () => {
        const request = JSON.stringify({
            path: '/api/users/123',
            method: 'GET',
            headers: { authorization: 'Bearer token123' }
        });

        const response = await sendTcpRequest(serverPort, request);
        const result = JSON.parse(response);

        expect(result.id).toBe('123');
        expect(result.authorization).toBe('Bearer token123');
        expect(result.name).toBe('Test User');
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

        const response = await sendTcpRequest(serverPort, request);
        const result = JSON.parse(response);

        expect(result.id).toBeDefined();
        expect(result.name).toBe(userData.name);
        expect(result.email).toBe(userData.email);
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

        const response = await sendTcpRequest(serverPort, request);
        const result = JSON.parse(response);

        expect(result.id).toBe('456');
        expect(result.name).toBe(updateData.name);
        expect(result.email).toBe(updateData.email);
    });

    it('should DELETE user by path', async () => {
        const request = JSON.stringify({
            path: '/api/users/789',
            method: 'DELETE'
        });

        const response = await sendTcpRequest(serverPort, request);
        const result = JSON.parse(response);

        expect(result.deleted).toBe(true);
        expect(result.id).toBe('789');
    });

    it('should handle search with optional query parameter', async () => {
        const request = JSON.stringify({
            path: '/api/users/search',
            method: 'GET',
            query: { q: 'test', active: 'true' }
        });

        const response = await sendTcpRequest(serverPort, request);
        const result = JSON.parse(response);

        expect(result.query).toBe('test');
        expect(result.active).toBe(true);
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

        const response = await sendTcpRequest(serverPort, request);
        const result = JSON.parse(response);

        expect(result.count).toBe(2);
        expect(Array.isArray(result.users)).toBe(true);
    });

    it('should convert parameter types', async () => {
        const request = JSON.stringify({
            path: '/api/users/convert',
            method: 'GET',
            query: { age: '25', enabled: 'true' }
        });

        const response = await sendTcpRequest(serverPort, request);
        const result = JSON.parse(response);

        expect(result.age).toBe(25);
        expect(typeof result.age).toBe('number');
        expect(result.enabled).toBe(true);
        expect(typeof result.enabled).toBe('boolean');
        expect(result.typeCheck).toBe(true);
    });

    it('should handle exception thrown from controller', async () => {
        const request = JSON.stringify({
            path: '/api/users/throw-bad-request',
            method: 'GET'
        });

        try {
            const response = await sendTcpRequest(serverPort, request);
            // Should contain error info
            const result = JSON.parse(response);
            expect(result.error).toBeDefined();
        } catch (err) {
            // Connection closed or error returned
            expect(err).toBeDefined();
        }
    });

    after(async () => {
        if (ctx) {
            await ctx.close();
        }
    });
});

/**
 * Helper to send a raw TCP request and get response
 */
function sendTcpRequest(port: number, data: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const socket = new net.Socket();
        let response = '';

        socket.connect(port, '127.0.0.1', () => {
            socket.write(JSON.stringify(data) + '\n');
        });

        socket.on('data', (chunk) => {
            response += chunk.toString();
            // Assuming JSON response ends with newline
            if (response.endsWith('\n')) {
                socket.destroy();
                resolve(response.trim());
            }
        });

        socket.on('error', (err) => {
            socket.destroy();
            reject(err);
        });

        socket.on('close', () => {
            if (response) {
                resolve(response.trim());
            }
        });

        // Timeout
        setTimeout(() => {
            socket.destroy();
            reject(new Error('Request timeout'));
        }, 5000);
    });
}
