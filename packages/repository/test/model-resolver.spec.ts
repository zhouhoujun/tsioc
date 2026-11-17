import { createInjector, createRunContext, RunContext } from '@tsdi/ioc';
import { createModelResolver, DBPropertyMetadata, ModelResolveOption } from '../src';
import expect = require('expect');

class Address {
    street?: string;
}

class User {
    id?: number;
    name?: string;
    address?: Address;
    note?: string;
}

const userProps = [
    { propertyKey: 'id', type: Number, dbtype: 'int', primary: true },
    { propertyKey: 'name', type: String, dbtype: 'varchar' },
    { propertyKey: 'address', type: Address, provider: Address },
    { propertyKey: 'note', type: String, dbtype: 'varchar', nullable: true }
] as unknown as DBPropertyMetadata[];

const addressProps = [
    { propertyKey: 'street', type: String, dbtype: 'varchar' }
] as unknown as DBPropertyMetadata[];

// `parseDbtype` maps `varchar` to the generic `string` pipe.
const pipes = {
    int: { transform: (value: any) => Number(value) },
    string: { transform: (value: any) => String(value) }
};

interface Harness {
    resolve(fields: any, parameter?: any, nullable?: boolean): any;
    intercept(parameter: any, fields: any): { nextCalled: boolean; result?: any };
    context: RunContext;
}

function harness(overrides: Partial<ModelResolveOption> = {}): Harness {
    const injector = createInjector();
    const runtime = injector.getRuntime();
    const context = createRunContext(injector);
    for (const [name, pipe] of Object.entries(pipes)) {
        context.set(name as any, pipe as any);
    }

    let current: any;
    const option: ModelResolveOption = {
        isModel: (type: any) => type === User || type === Address,
        getPropertyMeta: (type: any) => type === User ? userProps : type === Address ? addressProps : [],
        getFields: () => current,
        hasField: () => true,
        ...overrides
    };
    const resolver: any = createModelResolver(runtime, option);

    return {
        context,
        resolve(fields: any, parameter: any = { provider: User, type: User }, nullable?: boolean) {
            current = fields;
            return resolver.resolveModel(User, context, fields, nullable);
        },
        intercept(parameter: any, fields: any) {
            current = fields;
            let nextCalled = false;
            const next = { handle: () => { nextCalled = true; return { passed: true }; } };
            const result = resolver.intercept(parameter, next, context);
            return { nextCalled, result };
        }
    };
}

describe('model argument resolver', () => {

    it('resolves scalar, nullable and nested model fields', () => {
        const h = harness();

        const user = h.resolve({
            id: '7',
            name: 'Ada',
            address: { street: 'Main' }
        });

        expect(user instanceof User).toBe(true);
        expect(user.id).toBe(7);
        expect(user.name).toBe('Ada');
        expect(user.address instanceof Address).toBe(true);
        expect(user.address.street).toBe('Main');
        expect(user.note).toBeUndefined();
    });

    it('returns null for a nullable model without fields', () => {
        const h = harness();

        expect(h.resolve(undefined, undefined, true)).toBeNull();
    });

    it('fails with a diagnostic error when a required nested model has no fields', () => {
        const h = harness();

        let error: any;
        try {
            h.resolve({ name: 'Ada' });
        } catch (err) {
            error = err;
        }

        expect(error).toBeDefined();
        expect(error.message).toContain('missing modle properties');
        expect(error.message).toContain('Address');
    });

    it('leaves out fields the resolver cannot produce', () => {
        // A missing scalar is reported as "not resolved" and simply not set on
        // the instance; only a nested model without fields is fatal.
        const h = harness();

        const user = h.resolve({ address: { street: 'Main' } });

        expect(user.name).toBeUndefined();
        expect(user.address.street).toBe('Main');
    });

    it('keeps nullable fields optional but still parses them when present', () => {
        const h = harness();

        const withNote = h.resolve({ name: 'Ada', note: 'hi', address: { street: 'Main' } });
        expect(withNote.note).toBe('hi');
    });

    it('passes the parameter through when the type is not a model', () => {
        const h = harness({ isModel: () => false });

        const { nextCalled, result } = h.intercept({ provider: Date, type: Date }, { any: 1 });

        expect(nextCalled).toBe(true);
        expect(result).toEqual({ passed: true });
    });

    it('resolves the model when fields are available', () => {
        const h = harness();

        const { result } = h.intercept({ provider: User, type: User }, { name: 'Ada', address: { street: 'Main' } });

        expect(result instanceof User).toBe(true);
        expect(result.name).toBe('Ada');
    });

    it('maps multiple field sets to an array when the parameter is multi', () => {
        const h = harness({ getFields: () => [
            { name: 'a', address: { street: 'A' } },
            { name: 'b', address: { street: 'B' } }
        ] });

        const { result } = h.intercept({ provider: User, type: User, multi: true }, undefined);

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(2);
        expect(result[0].name).toBe('a');
        expect(result[1].name).toBe('b');
    });

    it('throws a diagnostic error when a multi parameter has no fields', () => {
        const h = harness({ getFields: (() => undefined) as any });

        expect(() => h.intercept({ provider: User, type: User }, undefined))
            .toThrow(/missing modle properties/);
    });

});
