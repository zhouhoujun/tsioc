import {
    createInjector, InjectUtil, Injectable, Singleton, InjectFlags, AbstractType,
    getClassRef, StaticProvider
} from '../src';
import expect = require('expect');

@Injectable()
class TransientService {
    static created = 0;
    readonly id: number;
    constructor() {
        this.id = ++TransientService.created;
    }
}

@Singleton()
class SharedService {
    value = 'shared';
}

@Injectable()
class MissingDep {
    constructor(readonly dep: SharedService) { }
}

describe('InjectFlags routing', () => {

    it('NonSingleton must be a distinct bit', () => {
        const routing = InjectFlags.Host | InjectFlags.Self | InjectFlags.SkipSelf
            | InjectFlags.Optional | InjectFlags.Resolve | InjectFlags.Request;
        expect(InjectFlags.NonSingleton & routing).toBe(0);
        expect(InjectFlags.NonSingleton).toBeGreaterThan(InjectFlags.Request);
    });

    it('get with NonSingleton creates a new instance per resolution', () => {
        const container = createInjector();
        InjectUtil.register(container, TransientService);

        const first = container.get(TransientService, undefined, InjectFlags.NonSingleton);
        const second = container.get(TransientService, undefined, InjectFlags.NonSingleton);

        expect(first).toBeDefined();
        expect(second).toBeDefined();
        expect(first).not.toBe(second);
        expect(first.id).not.toEqual(second.id);

        container.destroy();
    });

    it('get without NonSingleton returns the cached instance', () => {
        const container = createInjector();
        InjectUtil.register(container, SharedService);

        expect(container.get(SharedService)).toBe(container.get(SharedService));

        container.destroy();
    });

    it('Optional returns null for a missing token instead of throwing', () => {
        const container = createInjector();

        expect(container.get(MissingDep, undefined, InjectFlags.Optional)).toBeNull();

        container.destroy();
    });

    it('Optional returns null for a missing token on a child injector', () => {
        const container = createInjector();
        const child = createInjector(container, []);

        expect(child.get(MissingDep, undefined, InjectFlags.Optional)).toBeNull();

        child.destroy();
        container.destroy();
    });

    it('Optional still resolves tokens that exist', () => {
        const container = createInjector();
        InjectUtil.register(container, SharedService);
        const child = createInjector(container, []);

        expect(child.get(SharedService, undefined, InjectFlags.Optional)).toBeDefined();
        expect(child.get(SharedService, undefined, InjectFlags.Optional)).toBe(container.get(SharedService));

        child.destroy();
        container.destroy();
    });

    it('a missing token without Optional still throws', () => {
        const container = createInjector();

        expect(() => container.get(MissingDep)).toThrow(/No provider for/);

        container.destroy();
    });

    it('child injectors resolve providers registered on the parent', () => {
        const container = createInjector();
        InjectUtil.register(container, SharedService);
        const child = createInjector(container, []);

        expect(child.get(SharedService)).toBe(container.get(SharedService));

        child.destroy();
        container.destroy();
    });

    it('destroying a child injector keeps the parent usable', () => {
        const container = createInjector();
        InjectUtil.register(container, SharedService);
        const child = createInjector(container, []);
        child.get(SharedService);

        child.destroy();

        expect(container.destroyed).toBe(false);
        expect(container.get(SharedService)).toBeDefined();

        container.destroy();
    });

});

describe('Runtime type providers', () => {

    it('setTypeProvider appends every provider', () => {
        const container = createInjector();
        const runtime = container.getRuntime();
        const type = SharedService as AbstractType;
        const a: StaticProvider = { provide: SharedService, useValue: 'a' };
        const b: StaticProvider = { provide: SharedService, useValue: 'b' };

        runtime.setTypeProvider(type, a, b);

        const providers = runtime.getTypeProvider(type);
        expect(providers.length).toBe(2);
        expect(providers[0]).toBe(a);
        expect(providers[1]).toBe(b);

        container.destroy();
    });

    it('removeTypeProvider removes exactly the given providers', () => {
        const container = createInjector();
        const runtime = container.getRuntime();
        const type = SharedService as AbstractType;
        const a: StaticProvider = { provide: SharedService, useValue: 'a' };
        const b: StaticProvider = { provide: SharedService, useValue: 'b' };
        const c: StaticProvider = { provide: SharedService, useValue: 'c' };

        runtime.setTypeProvider(type, a, b, c);
        runtime.removeTypeProvider(type, b);

        const providers = runtime.getTypeProvider(type);
        expect(providers.length).toBe(2);
        expect(providers.indexOf(b)).toBe(-1);
        expect(providers.indexOf(a)).toBeGreaterThanOrEqual(0);
        expect(providers.indexOf(c)).toBeGreaterThanOrEqual(0);

        container.destroy();
    });

    it('setTypeProvider does not alias the caller array', () => {
        const container = createInjector();
        const runtime = container.getRuntime();
        const type = SharedService as AbstractType;
        const provider: StaticProvider = { provide: SharedService, useValue: 'a' };
        const source = [provider];

        runtime.setTypeProvider(type, ...source);
        source.push({ provide: SharedService, useValue: 'b' });

        expect(runtime.getTypeProvider(type).length).toBe(1);

        container.destroy();
    });

    it('removeTypeProvider ignores providers that were never registered', () => {
        const container = createInjector();
        const runtime = container.getRuntime();
        const type = SharedService as AbstractType;
        const a: StaticProvider = { provide: SharedService, useValue: 'a' };
        const other: StaticProvider = { provide: SharedService, useValue: 'other' };

        runtime.setTypeProvider(type, a);

        expect(() => runtime.removeTypeProvider(type, other)).not.toThrow();
        expect(runtime.getTypeProvider(type).indexOf(a)).toBeGreaterThanOrEqual(0);

        container.destroy();
    });

    it('class metadata providers keep working through getTypeProvider', () => {
        const container = createInjector();
        const runtime = container.getRuntime();
        const typeRef = getClassRef(SharedService);

        expect(runtime.getTypeProvider(typeRef)).toBeDefined();

        container.destroy();
    });

});
