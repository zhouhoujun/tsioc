import { getClassRef } from '@tsdi/ioc';
import {
    RouteMapping,
    Get,
    Post,
    RequestBody,
    RequestParam,
    RequestPath,
    ContentInterceptor,
    JsonInterceptor
} from '../src';
import expect = require('expect');

describe('endpoints metadata', () => {
    @RouteMapping('/api/users')
    class UserController {
        @Get('/:id')
        detail(
            @RequestPath('id') id: string,
            @RequestParam('verbose') verbose: string,
            @RequestBody() body: any
        ) {
            return { id, verbose, body };
        }

        @Post('/')
        create(@RequestBody() body: any) {
            return body;
        }
    }

    const typeRef = getClassRef(UserController);

    it('stores route mapping metadata on controller', () => {
        const annotation = typeRef.getAnnotation<any>();
        expect(annotation).toBeDefined();
        expect(typeRef.getDefines(RouteMapping as any).length).toBeGreaterThan(0);
    });

    it('stores parameter scopes for method arguments', () => {
        const params = typeRef.getParameters('detail') as any[];
        expect(params.map((p: any) => p.scope)).toEqual(['path', 'query', 'body']);
        expect(params[0].field).toBe('id');
        expect(params[1].field).toBe('verbose');
    });

    it('stores request body scope for create method', () => {
        const params = typeRef.getParameters('create') as any[];
        expect(params?.length).toBe(1);
        expect(params?.[0]?.scope).toBe('body');
    });

    it('stores method route metadata for GET decorator', () => {
        const define = typeRef.getDefines(Get as any).find((item: any) => item.propertyKey === 'detail');
        expect(define?.metadata?.route).toBe(':id');
    });

    it('exports core interceptors', () => {
        expect(ContentInterceptor).toBeDefined();
        expect(JsonInterceptor).toBeDefined();
    });
});
