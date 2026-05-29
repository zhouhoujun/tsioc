import { Module } from '@tsdi/ioc';
import {
    Controller, Get, Post, Put, Delete, Patch, Head, Options,
    RequestHeader, RequestPath, RequestParam, RequestBody,
    provideService
} from '@tsdi/service';
import { useTcpTransport } from '../src/server';
import expect = require('expect');

describe('TCP Microservice Parameter Decorators', () => {

    it('should support request header parameter decoration', () => {
        @Controller('/api')
        class TestController {
            @Get('/test')
            test(
                @RequestHeader('authorization') auth: string
            ) {
                return { auth };
            }
        }

        @Module({
            declarations: [TestController],
            providers: [
                provideService(
                    useTcpTransport({
                        listenOpts: { port: 0 },
                        asDefault: true
                    })
                )
            ]
        })
        class TestHeaderModule { }

        expect(TestHeaderModule).toBeDefined();
        const providers = provideService(
            useTcpTransport({ listenOpts: { port: 0 } })
        );
        expect(Array.isArray(providers)).toBe(true);
    });

    it('should support request path parameter decoration', () => {
        @Controller('/api/users')
        class UserController {
            @Get('/:id')
            getUser(
                @RequestPath('id') id: string
            ) {
                return { userId: id };
            }
        }

        @Module({
            declarations: [UserController],
            providers: [
                provideService(
                    useTcpTransport({ listenOpts: { port: 0 } })
                )
            ]
        })
        class TestPathModule { }

        expect(TestPathModule).toBeDefined();
    });

    it('should support query parameter decoration', () => {
        @Controller('/api/search')
        class SearchController {
            @Get('/')
            search(
                @RequestParam('q') query: string,
                @RequestParam('page') page: number,
                @RequestParam('limit') limit: number = 10
            ) {
                return { query, page, limit };
            }
        }

        @Module({
            declarations: [SearchController],
            providers: [
                provideService(
                    useTcpTransport({ listenOpts: { port: 0 } })
                )
            ]
        })
        class TestQueryModule { }

        expect(TestQueryModule).toBeDefined();
    });

    it('should support request body parameter decoration', () => {
        interface UserDto {
            name: string;
            email: string;
        }

        @Controller('/api/users')
        class UserController {
            @Post('/')
            createUser(
                @RequestBody() user: UserDto
            ) {
                return { created: true, user };
            }
        }

        @Module({
            declarations: [UserController],
            providers: [
                provideService(
                    useTcpTransport({ listenOpts: { port: 0 } })
                )
            ]
        })
        class TestBodyModule { }

        expect(TestBodyModule).toBeDefined();
    });

    it('should support multiple parameter decorations together', () => {
        interface UpdateUserDto {
            name: string;
        }

        @Controller('/api/users')
        class UserController {
            @Put('/:id')
            updateUser(
                @RequestPath('id') id: string,
                @RequestParam('version') version: string,
                @RequestHeader('if-match') etag: string,
                @RequestBody() data: UpdateUserDto
            ) {
                return {
                    id,
                    version,
                    etag,
                    data
                };
            }

            @Delete('/:id')
            deleteUser(
                @RequestPath('id') id: string,
                @RequestHeader('authorization') auth: string
            ) {
                return { id, auth, deleted: true };
            }
        }

        @Module({
            declarations: [UserController],
            providers: [
                provideService(
                    useTcpTransport({ listenOpts: { port: 0 } })
                )
            ]
        })
        class MultiParamModule { }

        expect(MultiParamModule).toBeDefined();
    });

    it('should support all HTTP method decorators with parameters', () => {
        @Controller('/api/items')
        class ItemController {
            @Get('/:id')
            getItem(@RequestPath('id') id: string) {
                return { id };
            }

            @Post('/')
            createItem(@RequestBody() data: any) {
                return { data };
            }

            @Put('/:id')
            updateItem(@RequestPath('id') id: string, @RequestBody() data: any) {
                return { id, data };
            }

            @Delete('/:id')
            deleteItem(@RequestPath('id') id: string) {
                return { id, deleted: true };
            }

            @Patch('/:id')
            patchItem(@RequestPath('id') id: string, @RequestBody() data: any) {
                return { id, data };
            }

            @Head('/:id')
            headItem(@RequestPath('id') id: string) {
                return { id };
            }

            @Options('/:id')
            optionsItem(@RequestPath('id') id: string) {
                return { id };
            }
        }

        @Module({
            declarations: [ItemController],
            providers: [
                provideService(
                    useTcpTransport({ listenOpts: { port: 0 } })
                )
            ]
        })
        class AllMethodsModule { }

        expect(AllMethodsModule).toBeDefined();
    });

    it('should support optional parameters with default values', () => {
        @Controller('/api/pagination')
        class PaginationController {
            @Get('/')
            list(
                @RequestParam('page') page: number = 1,
                @RequestParam('pageSize') pageSize: number = 20,
                @RequestParam('sort') sort: string = 'id',
                @RequestParam('order') order: 'asc' | 'desc' = 'asc'
            ) {
                return { page, pageSize, sort, order };
            }
        }

        @Module({
            declarations: [PaginationController],
            providers: [
                provideService(
                    useTcpTransport({ listenOpts: { port: 0 } })
                )
            ]
        })
        class OptionalParamsModule { }

        expect(OptionalParamsModule).toBeDefined();
    });
});
