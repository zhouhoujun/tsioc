import expect = require('expect');
import { ContextToken, Context, TokenValue, InvokeProviders, InvokeOptions, TargetInvokeArguments, InvocationOptions, hasContextOptions } from '../src/context';
import { InjectToken, token } from '../src/tokens';

describe('Context Types and Functions', () => {

    describe('ContextToken', () => {
        it('should create with default value factory', () => {
            const ctxToken = new ContextToken(() => 'default');
            expect(ctxToken.defaultValue()).toBe('default');
        });

        it('should create with object default value', () => {
            const ctxToken = new ContextToken(() => ({ key: 'value' }));
            const val = ctxToken.defaultValue();
            expect(val.key).toBe('value');
        });

        it('should create with number default value', () => {
            const ctxToken = new ContextToken(() => 42);
            expect(ctxToken.defaultValue()).toBe(42);
        });
    });

    describe('TokenValue type', () => {
        it('should accept token-value pairs', () => {
            const tk = token('test');
            const pair: TokenValue<string> = [tk, 'value'];
            expect(pair[0]).toBe(tk);
            expect(pair[1]).toBe('value');
        });

        it('should accept string token-value pairs', () => {
            const pair: TokenValue<number> = ['myToken', 123];
            expect(pair[0]).toBe('myToken');
            expect(pair[1]).toBe(123);
        });
    });

    describe('InvokeProviders interface', () => {
        it('should accept values array', () => {
            const providers: InvokeProviders = {
                values: [['token1', 'value1'], ['token2', 'value2']]
            };
            expect(providers.values!.length).toBe(2);
        });

        it('should accept resolvers array', () => {
            const providers: InvokeProviders = {
                resolvers: ['MyResolver' as any]
            };
            expect(providers.resolvers!.length).toBe(1);
        });

        it('should accept providers array', () => {
            const providers: InvokeProviders = {
                providers: [{ provide: 'test', useValue: 'value' }]
            };
            expect(providers.providers!.length).toBe(1);
        });

        it('should accept all options', () => {
            const options: InvokeProviders = {
                values: [['token', 'value']],
                resolvers: [],
                providers: []
            };
            expect(options.values).toBeDefined();
            expect(options.resolvers).toBeDefined();
            expect(options.providers).toBeDefined();
        });
    });

    describe('InvokeOptions interface', () => {
        it('should extend InvokeProviders with payload', () => {
            const options: InvokeOptions = {
                values: [['token', 'value']],
                payload: { data: 'test' }
            };
            expect(options.payload).toEqual({ data: 'test' });
        });
    });

    describe('TargetInvokeArguments interface', () => {
        it('should extend InvokeOptions with target info', () => {
            class TargetClass {}
            const args: TargetInvokeArguments = {
                payload: 'test',
                targetType: TargetClass,
                propertyKey: 'method',
                isResolve: true
            };
            expect(args.targetType).toBe(TargetClass);
            expect(args.propertyKey).toBe('method');
            expect(args.isResolve).toBeTruthy();
        });
    });

    describe('InvocationOptions interface', () => {
        it('should support all options', () => {
            class TestClass {}
            const options: InvocationOptions<TestClass> = {
                targetType: TestClass,
                propertyKey: 'run',
                bootstrap: true,
                payload: {}
            };
            expect(options.targetType).toBe(TestClass);
            expect(options.propertyKey).toBe('run');
            expect(options.bootstrap).toBeTruthy();
        });
    });

    describe('hasContextOptions', () => {
        it('should return false for undefined', () => {
            expect(hasContextOptions(undefined)).toBeFalsy();
        });

        it('should return false for empty object', () => {
            expect(hasContextOptions({})).toBeFalsy();
        });

        it('should return true for providers', () => {
            expect(hasContextOptions({ providers: [{ provide: 'test', useValue: 'val' }] })).toBeTruthy();
        });

        it('should return true for resolvers', () => {
            expect(hasContextOptions({ resolvers: ['Resolver' as any] })).toBeTruthy();
        });

        it('should return true for values', () => {
            expect(hasContextOptions({ values: [['token', 'value']] })).toBeTruthy();
        });

        it('should return false for other properties', () => {
            expect(hasContextOptions({ payload: 'test' })).toBeFalsy();
        });
    });
});