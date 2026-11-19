import expect = require('expect');
import { createInjector, Injector, Parameter, Resolver, RunContext, token } from '@tsdi/ioc';

class CustomResolver extends Resolver {
    calls = 0;

    resolve<T>(_parameter: Parameter<T>, _context: RunContext): T {
        this.calls += 1;
        return 'custom' as any;
    }

    resolveParams(): any[] {
        return [];
    }
}

describe('resolver extension path', () => {
    it('keeps a custom Resolver authoritative', () => {
        const custom = new CustomResolver();
        const injector = createInjector([
            { provide: Resolver, useValue: custom }
        ]) as Injector;
        const value = injector.resolve(token('CUSTOM_TOKEN') as any);
        expect(value).toBe('custom');
        expect(custom.calls).toBe(1);
    });
});
