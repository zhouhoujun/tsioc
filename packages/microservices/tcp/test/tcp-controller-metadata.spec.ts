import {
    Controller, RestController, Get, Post, Put, Delete, Patch, Head, Options,
    RequestHeader, RequestPath, RequestParam, RequestBody
} from '@tsdi/service';
import expect = require('expect');

describe('TCP Microservice Controller Metadata', () => {

    describe('@Controller decoration', () => {
        it('should accept route prefix and create controller without error', () => {
            @Controller('/api/test')
            class TestController { }

            expect(TestController).toBeDefined();
        });

        it('should work without route prefix', () => {
            @Controller()
            class TestController { }

            expect(TestController).toBeDefined();
        });
    });

    describe('@RestController decoration', () => {
        it('should accept route prefix and create controller without error', () => {
            @RestController('/api')
            class TestController { }

            expect(TestController).toBeDefined();
        });
    });

    describe('HTTP method decorators', () => {
        it('should apply @Get method decoration without error', () => {
            class TestController {
                @Get('/hello')
                hello() {
                    return 'hello';
                }
            }

            expect(TestController).toBeDefined();
        });

        it('should apply @Post, @Put, @Delete, @Patch without error', () => {
            class TestController {
                @Post('/users')
                create() { }

                @Put('/users/:id')
                update() { }

                @Delete('/users/:id')
                remove() { }

                @Patch('/users/:id')
                patch() { }
            }

            expect(TestController).toBeDefined();
        });

        it('should apply @Head and @Options without error', () => {
            class TestController {
                @Head('/:id')
                head() { }

                @Options('/:id')
                options() { }
            }

            expect(TestController).toBeDefined();
        });
    });

    describe('Parameter decorators', () => {
        it('should apply @RequestPath without error', () => {
            class TestController {
                getUser(@RequestPath('id') id: string) {
                    return { id };
                }
            }

            expect(TestController).toBeDefined();
        });

        it('should apply @RequestParam without error', () => {
            class TestController {
                search(@RequestParam('q') query: string, @RequestParam('page') page: number) {
                    return { query, page };
                }
            }

            expect(TestController).toBeDefined();
        });

        it('should apply @RequestHeader without error', () => {
            class TestController {
                get(@RequestHeader('authorization') auth: string) {
                    return { auth };
                }
            }

            expect(TestController).toBeDefined();
        });

        it('should apply @RequestBody without error', () => {
            class TestController {
                create(@RequestBody() data: any) {
                    return { data };
                }
            }

            expect(TestController).toBeDefined();
        });

        it('should apply all parameter types together without error', () => {
            class TestController {
                update(
                    @RequestPath('id') id: string,
                    @RequestHeader('if-match') etag: string,
                    @RequestParam('version') version: string,
                    @RequestBody() data: any
                ) {
                    return { id, etag, version, data };
                }
            }

            expect(TestController).toBeDefined();
        });
    });


    describe('Full controller example', () => {
        it('should compile complete controller with all decorators', () => {
            interface CreateUserRequest {
                name: string;
                email: string;
            }

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
                    @RequestParam('pageSize') pageSize: number = 20
                ) {
                    return { page, pageSize, data: [] as User[] };
                }

                @Get('/:id')
                get(
                    @RequestPath('id') id: string,
                    @RequestHeader('accept') accept: string
                ) {
                    return { id, accept };
                }

                @Post('/')
                create(
                    @RequestBody() body: CreateUserRequest
                ) {
                    return { id: '1', ...body };
                }

                @Put('/:id')
                update(
                    @RequestPath('id') id: string,
                    @RequestBody() body: Partial<CreateUserRequest>
                ) {
                    return { id, ...body };
                }

                @Delete('/:id')
                delete(
                    @RequestPath('id') id: string
                ) {
                    return { deleted: true, id };
                }
            }

            expect(UserController).toBeDefined();
        });
    });
});
