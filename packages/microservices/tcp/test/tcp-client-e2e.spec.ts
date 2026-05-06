import { Module, Provider } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { BadRequestException } from '@tsdi/common';
import { provideClient } from '@tsdi/client';
import { provideService, withServiceRouter, Controller, Get, Post, Put, Delete, RequestHeader, RequestPath, RequestParam, RequestBody } from '@tsdi/service';
import { withTcpTransport } from '../src/server';
import { withTcpClientTransport, TcpClient } from '../src/client';
import expect = require('expect');

describe('TCP Microservice Client End-to-End Test', () => {

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
            provideService(
                withServiceRouter(),
                withTcpTransport({
                    listenOpts: { port: 0, host: '127.0.0.1' },
                })
            ),
            provideClient(
                // Add client providers
                withTcpClientTransport({
                    connectOpts: { port: 0, host: '127.0.0.1' },
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
        const TcpServerType = require('../src/server/tcp-server').TcpServer;
        const tcpServer = ctx.get(TcpServerType) as any;
        console.log('tcpServer:', !!tcpServer);
        console.log('tcpServer.serv:', !!tcpServer?.serv);
        // Wait a bit for server to start
        await new Promise(resolve => setTimeout(resolve, 200));
        if (tcpServer && tcpServer.serv) {
            const address = tcpServer.serv.address();
            console.log('address:', address);
            if (address && typeof address === 'object' && 'port' in address) {
                serverPort = address.port;
                console.log('serverPort:', serverPort);
                // Update client connection port
                const tcpClient = ctx.get(TcpClient);
                // @ts-ignore
                tcpClient.options.connectOpts!.port = serverPort;
            }
        }
        expect(serverPort).toBeGreaterThan(0);
    });

    it('should GET user list with query parameters via client', async () => {
        const client = ctx.get(TcpClient);
        const result = await client.send('/api/users', {
            params: { page: '2', pageSize: '20', sort: 'name' },
            headers: { accept: 'application/json' }
        }).toPromise();

        expect(result.page).toBe(2);
        expect(result.pageSize).toBe(20);
        expect(result.sort).toBe('name');
        expect(result.accept).toBe('application/json');
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data.length).toBe(2);
    });

    it('should GET user by path parameter via client', async () => {
        const client = ctx.get(TcpClient);
        const result = await client.send('/api/users/123', {
            headers: { authorization: 'Bearer token123' },
            method: 'GET'
        }).toPromise();

        expect(result.id).toBe('123');
        expect(result.authorization).toBe('Bearer token123');
        expect(result.name).toBe('Test User');
    });

    it('should POST create new user with request body via client', async () => {
        const client = ctx.get(TcpClient);
        const userData = {
            name: 'New User',
            email: 'new@example.com'
        };

        const result = await client.send('/api/users', {
            method: 'POST',
            body: userData
        }).toPromise();

        expect(result.id).toBeDefined();
        expect(result.name).toBe(userData.name);
        expect(result.email).toBe(userData.email);
    });

    it('should PUT update user with path and body via client', async () => {
        const client = ctx.get(TcpClient);
        const updateData = {
            name: 'Updated User',
            email: 'updated@example.com'
        };

        const result = await client.send('/api/users/456', {
            method: 'PUT',
            body: updateData
        }).toPromise();

        expect(result.id).toBe('456');
        expect(result.name).toBe(updateData.name);
        expect(result.email).toBe(updateData.email);
    });

    it('should DELETE user by path via client', async () => {
        const client = ctx.get(TcpClient);
        const result = await client.send('/api/users/789', {
            method: 'DELETE'
        }).toPromise();

        expect(result.deleted).toBe(true);
        expect(result.id).toBe('789');
    });

    it('should handle search with optional query parameter via client', async () => {
        const client = ctx.get(TcpClient);
        const result = await client.send('/api/users/search', {
            method: 'GET',
            params: { q: 'test', active: 'true' }
        }).toPromise();

        expect(result.query).toBe('test');
        expect(result.active).toBe(true);
    });

    it('should convert parameter types via client', async () => {
        const client = ctx.get(TcpClient);
        const result = await client.send('/api/users/convert', {
            method: 'GET',
            params: { age: '25', enabled: 'true' }
        }).toPromise();

        expect(result.age).toBe(25);
        expect(typeof result.age).toBe('number');
        expect(result.enabled).toBe(true);
        expect(typeof result.enabled).toBe('boolean');
        expect(result.typeCheck).toBe(true);
    });

    after(async () => {
        if (ctx) {
            await ctx.close();
        }
    });
});
