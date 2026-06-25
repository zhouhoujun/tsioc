import { getClassRef } from '@tsdi/ioc';
import { Transport } from '@tsdi/common';
import {
    getSubscribePatterns,
    getServiceRouterToken,
    Controller,
    Get,
    Handle,
    Post,
    RequestBody,
    RequestHeader,
    RequestParam,
    RequestPath,
    Subscribe
} from '../src';
import { createInjector } from '@tsdi/ioc';
import expect = require('expect');

describe('service metadata', () => {
    @Controller('/api/users')
    class UserController {
        @Get('/:id')
        detail(
            @RequestPath('id') id: string,
            @RequestParam('verbose') verbose: string,
            @RequestHeader('authorization') authorization: string,
            @RequestBody() body: any
        ) {
            return { id, verbose, authorization, body };
        }

        @Post('/')
        create(@RequestBody() body: any) {
            return body;
        }

        @Handle('users.echo', Transport.TCP)
        echo(@RequestBody() body: any) {
            return body;
        }

        @Subscribe('users.events', Transport.TCP)
        onEvent(@RequestBody() body: any) {
            return body;
        }
    }

    const typeRef = getClassRef(UserController);

    it('stores controller annotation metadata', () => {
        const annotation = typeRef.getAnnotation<any>();
        expect(annotation).toBeDefined();
        expect(typeRef.getDefines(Controller as any).length).toBeGreaterThan(0);
    });

    it('stores parameter scopes for method arguments', () => {
        const params = typeRef.getParameters('detail') as any[];
        expect(params.map(param => param.scope)).toEqual(['path', 'query', 'headers', 'body']);
        expect(params[0].field).toBe('id');
        expect(params[1].field).toBe('verbose');
        expect(params[2].field).toBe('authorization');
    });

    it('stores request body scope for create method', () => {
        const params = typeRef.getParameters('create') as any[];
        expect(params?.length).toBe(1);
        expect(params?.[0]?.scope).toBe('body');
    });

    it('stores handle metadata with transport and route', () => {
        const define = typeRef.getDefines(Handle as any).find((item: any) => item.propertyKey === 'echo');
        expect(define?.metadata?.route).toBe('users.echo');
        expect(define?.metadata?.transport).toBe(Transport.TCP);
        expect(define?.metadata?.resolvers?.length ?? 0).toBeGreaterThan(1);
    });

    it('stores subscribe metadata with transport and route', () => {
        const define = typeRef.getDefines(Subscribe as any).find((item: any) => item.propertyKey === 'onEvent');
        expect(define?.metadata?.route).toBe('users.events');
        expect(define?.metadata?.transport).toBe(Transport.TCP);
        expect(define?.metadata?.subscribe).toBe(true);
        expect(define?.metadata?.resolvers?.length ?? 0).toBeGreaterThan(1);
    });

    it('extracts subscribe patterns from subscribe routes only', () => {
        const config = {
            transport: Transport.TCP,
            microservice: true,
            features: {}
        } as any;
        const injector = createInjector([
            {
                provide: getServiceRouterToken(config),
                useValue: {
                    formatter: { format: (pattern: any) => String(pattern) },
                    routes: [
                        { pattern: 'users.events', subscribe: true },
                        { pattern: 'users.created', subscribe: true },
                        { pattern: 'users.echo', subscribe: false }
                    ]
                }
            } as any
        ]);

        expect(getSubscribePatterns(config, injector)).toEqual(['users.events', 'users.created']);
    });

    it('stores method route metadata for HTTP decorators', () => {
        const define = typeRef.getDefines(Get as any).find((item: any) => item.propertyKey === 'detail');
        expect(define?.metadata?.route).toBe(':id');
    });
});
