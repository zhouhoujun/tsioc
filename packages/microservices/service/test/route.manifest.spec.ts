import expect = require('expect');
import { createInjector } from '@tsdi/ioc';
import { PatternFormatter } from '@tsdi/common';
import { createControllerRoutes, RouteHandler } from '../src';

const formatter: PatternFormatter = {
    format: pattern => String(pattern)
};

function invocationOf(classRef: any, type: any = {}) {
    return { classRef, type, injector: createInjector() } as any;
}

describe('controller route manifest', () => {
    it('compiles controller routes once per class and instantiates them per prefix', () => {
        let scans = 0;
        const classRef = {
            getMethodDefines: (filter?: any) => {
                scans += 1;
                const defs = [{ propertyKey: 'ping', metadata: { route: '/ping', method: 'GET' } }];
                return filter ? defs.filter(filter) : defs;
            },
            getAnnotation: () => ({})
        };
        const invocation = invocationOf(classRef);

        const first = createControllerRoutes(invocation, '/api', undefined, formatter);
        const second = createControllerRoutes(invocation, '/v2', undefined, formatter);

        expect(scans).toBe(1);
        expect(first[0].path).toBe('/ping');
        expect(first[0].prefix).toBe('/api');
        expect(second[0].prefix).toBe('/v2');
        expect(first[0].handler).toBeInstanceOf(RouteHandler);
    });

    it('uses a precompiled ƿroutes manifest without scanning class metadata', () => {
        const classRef = {
            getMethodDefines: () => {
                throw new Error('metadata should not be scanned');
            },
            getParameters: () => [{ type: String }],
            getAnnotation: () => ({})
        };
        const invocation = invocationOf(classRef, {
            ƿroutes: [{
                propertyKey: 'create',
                pattern: '/precompiled',
                method: 'POST',
                options: {}
            }]
        });

        const routes = createControllerRoutes(invocation, '/api', { tenant: 1 }, formatter);

        expect(routes[0].path).toBe('/precompiled');
        expect(routes[0].method).toBe('POST');
        expect(routes[0].pathParams).toEqual({ tenant: 1 });
        expect(routes[0].handler).toBeInstanceOf(RouteHandler);
        expect((routes[0].handler as any).invokeOpts?.resolvers?.length).toBeGreaterThan(0);
    });
});
