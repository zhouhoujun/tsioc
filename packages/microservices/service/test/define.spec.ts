import expect = require('expect');
import { getClassRef, ModuleDef } from '@tsdi/ioc';
import { Transport } from '@tsdi/common';
import { defineService, describeService } from '../src/define';
import { ServiceFeatureKind } from '../src/options';

describe('defineService', () => {
    function transportFeature(overrides: any = {}) {
        return {
            kind: ServiceFeatureKind.Transport,
            config: {
                transport: Transport.HTTP,
                side: 0,
                microservice: true,
                features: {},
                ...overrides
            },
            providers: []
        } as any;
    }

    class UsersController { }

    it('summarizes declared capabilities', () => {
        const single = describeService({ transport: transportFeature(), controllers: [UsersController] });
        expect(single).toMatchObject({
            transports: 1,
            controllers: 1,
            router: true,
            health: true,
            registration: true,
            gracefulShutdown: true
        });
        expect(single.capabilities).toHaveLength(1);
        expect(single.capabilities[0].capabilities.name).toBe('HTTP');

        const multiple = describeService({
            transport: [transportFeature(), transportFeature()],
            health: false,
            router: false,
            registration: false,
            gracefulShutdown: false
        });
        expect(multiple).toMatchObject({
            transports: 2,
            controllers: 0,
            router: false,
            health: false,
            registration: false,
            gracefulShutdown: false
        });
        expect(multiple.capabilities).toHaveLength(2);
    });

    it('builds a module with declarations and service providers', () => {
        const definition = defineService({
            transport: transportFeature(),
            controllers: [UsersController],
            providers: [{ provide: 'USERS_STORE', useValue: { users: [] } } as any]
        });
        const def = getClassRef(definition).getAnnotation<ModuleDef>();

        expect(def.module).toBe(true);
        expect(def.declarations).toContain(UsersController);
        expect(def.providers?.some((provider: any) => provider.provide === 'USERS_STORE')).toBe(true);
        expect(def.providers?.length).toBeGreaterThan(1);
    });

    it('fails with an actionable message when no transport is provided', () => {
        expect(() => defineService({ transport: [] as any })).toThrow(/defineService requires at least one transport/);
    });
});
