import { createInjector, createRunContext } from '@tsdi/ioc';
import { DBPropertyMetadata, getModelFieldResolver } from '../src';
import expect = require('expect');

interface Pipe {
    calls: any[][];
    transform(value: any, ...args: any[]): any;
}

function pipe(result: (value: any, ...args: any[]) => any = value => value): Pipe {
    const record: Pipe = {
        calls: [],
        transform(value: any, ...args: any[]) {
            record.calls.push([value, ...args]);
            return result(value, ...args);
        }
    };
    return record;
}

function prop(props: Partial<DBPropertyMetadata>): DBPropertyMetadata {
    return { propertyKey: 'value', type: String, ...props } as DBPropertyMetadata;
}

function createScope(pipes: Record<string, Pipe>) {
    const injector = createInjector();
    const runtime = injector.getRuntime();
    const handler = getModelFieldResolver(runtime);
    const context = createRunContext(injector);
    for (const [name, impl] of Object.entries(pipes)) {
        context.set(name as any, impl as any);
    }
    return { injector, handler, context };
}

describe('getModelFieldResolver', () => {

    it('parses a dbtype column through its pipe', () => {
        const int = pipe(value => Number(value));
        const { injector, handler, context } = createScope({ int });

        const result = handler.handle([prop({ dbtype: 'int' }), { value: '42' }, class Target { }], context);

        expect(result).toBe(42);
        expect(int.calls).toEqual([['42']]);
        injector.destroy();
    });

    it('falls back to the column default when the value is missing', () => {
        const int = pipe(value => Number(value));
        const { injector, handler, context } = createScope({ int });

        const result = handler.handle([prop({ dbtype: 'int', default: '7' }), {}, class Target { }], context);

        expect(result).toBe(7);
        injector.destroy();
    });

    it('returns null when neither value nor default is present', () => {
        const int = pipe(value => Number(value));
        const { injector, handler, context } = createScope({ int });

        const result = handler.handle([prop({ dbtype: 'int' }), {}, class Target { }], context);

        expect(result).toBeNull();
        injector.destroy();
    });

    it('resolves a typed property through the pipe named after its type', () => {
        class Money { }
        const money = pipe();
        const { injector, handler, context } = createScope({ money });

        const result = handler.handle([prop({ provider: Money, type: Money }), { value: '1.00' }, class Target { }], context);

        expect(result).toBe('1.00');
        expect(money.calls).toEqual([['1.00']]);
        injector.destroy();
    });

    it('throws a diagnostic error when no pipe is registered', () => {
        const { injector, handler, context } = createScope({});

        expect(() => handler.handle([prop({ dbtype: 'int' }), { value: '42' }, class Target { }], context))
            .toThrow(/missing pipe to transform property value/);
        injector.destroy();
    });

    it('caches one handler per runtime', () => {
        const { injector, handler } = createScope({});
        expect(getModelFieldResolver(injector.getRuntime())).toBe(handler);
        injector.destroy();
    });

});
