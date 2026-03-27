import { Injectable, Injector, createInjector, Module, Abstract, isString, isPlainObject, HandlerFn } from '@tsdi/ioc';
import expect = require('expect');
import { Application, ApplicationContext, Filter, FilterResolver, FilterHandlerResolver, RunContext, Handler, composeFilters, FilterFn } from '../src';
import { DefaultFilterResolver, DefaultFiterHandlerMethodResolver } from '../src/filters/filter.impl';

@Injectable()
class StringFilter implements Filter {
    doFilter(input: any, next: Handler<any, any>, context: RunContext) {
        if (isString(input)) {
            return next.handle(input, context);
        }
        return 'not a string';
    }
}

@Injectable()
class JsonFilter implements Filter {
    doFilter(input: any, next: Handler<any, any>, context: RunContext) {
        if (isPlainObject(input)) {
            return next.handle(input, context);
        }
        return 'not a json object';
    }
}

@Injectable()
class LoggingFilter implements Filter {
    logs: string[] = [];
    
    doFilter(input: any, next: Handler<any, any>, context: RunContext) {
        this.logs.push(`before: ${JSON.stringify(input)}`);
        const result = next.handle(input, context);
        this.logs.push(`after: ${result}`);
        return result;
    }
}

@Injectable()
class UppercaseFilter implements Filter {
    doFilter(input: string, next: Handler<string, string>, context: RunContext) {
        return next.handle(input.toUpperCase(), context);
    }
}

@Injectable()
class PrefixFilter implements Filter {
    doFilter(input: string, next: Handler<string, string>, context: RunContext) {
        return next.handle('prefix_' + input, context);
    }
}

@Injectable()
class FilterWithEquals implements Filter {
    constructor(private id: string) {}
    
    doFilter(input: any, next: Handler<any, any>, context: RunContext) {
        return next.handle(input, context);
    }
    
    equals(target: any): boolean {
        return target instanceof FilterWithEquals && target.id === this.id;
    }
}

@Abstract()
abstract class TestService {
    abstract process(data: string): string;
}

@Injectable()
class TestServiceImpl implements TestService {
    process(data: string): string {
        return `processed: ${data}`;
    }
}

@Module({
    providers: [
        StringFilter,
        JsonFilter,
        LoggingFilter,
        UppercaseFilter,
        PrefixFilter,
        TestServiceImpl
    ]
})
class TestModule { }

describe('Filter Tests', () => {
    let injector: Injector;

    beforeEach(() => {
        injector = createInjector();
    });

    describe('DefaultFilterResolver', () => {
        it('should create instance', () => {
            const resolver = new DefaultFilterResolver(injector);
            expect(resolver).toBeInstanceOf(DefaultFilterResolver);
        });

        it('should add and resolve filters', () => {
            const resolver = new DefaultFilterResolver(injector);
            const filter = new StringFilter();
            
            resolver.addFilter(TestService, filter);
            const filters = resolver.resolve(TestService);
            
            expect(filters).toHaveLength(1);
            expect(filters[0]).toBe(filter);
        });

        it('should add multiple filters', () => {
            const resolver = new DefaultFilterResolver(injector);
            const filter1 = new StringFilter();
            const filter2 = new JsonFilter();
            
            resolver.addFilter(TestService, filter1);
            resolver.addFilter(TestService, filter2);
            const filters = resolver.resolve(TestService);
            
            expect(filters).toHaveLength(2);
            expect(filters[0]).toBe(filter1);
            expect(filters[1]).toBe(filter2);
        });

        it('should not add duplicate filters', () => {
            const resolver = new DefaultFilterResolver(injector);
            const filter = new StringFilter();
            
            resolver.addFilter(TestService, filter);
            resolver.addFilter(TestService, filter);
            const filters = resolver.resolve(TestService);
            
            expect(filters).toHaveLength(1);
        });

        it('should detect duplicates using equals method', () => {
            const resolver = new DefaultFilterResolver(injector);
            const filter1 = new FilterWithEquals('id1');
            const filter2 = new FilterWithEquals('id1');
            const filter3 = new FilterWithEquals('id2');
            
            resolver.addFilter(TestService, filter1);
            resolver.addFilter(TestService, filter2);
            resolver.addFilter(TestService, filter3);
            const filters = resolver.resolve(TestService);
            
            expect(filters).toHaveLength(2);
        });

        it('should remove filter', () => {
            const resolver = new DefaultFilterResolver(injector);
            const filter1 = new StringFilter();
            const filter2 = new JsonFilter();
            
            resolver.addFilter(TestService, filter1);
            resolver.addFilter(TestService, filter2);
            resolver.removeFilter(TestService, filter1);
            const filters = resolver.resolve(TestService);
            
            expect(filters).toHaveLength(1);
            expect(filters[0]).toBe(filter2);
        });

        it('should resolve by string key', () => {
            const resolver = new DefaultFilterResolver(injector);
            const filter = new StringFilter();
            
            resolver.addFilter('testKey', filter);
            const filters = resolver.resolve('testKey');
            
            expect(filters).toHaveLength(1);
            expect(filters[0]).toBe(filter);
        });

        it('should return empty array for unresolved target', () => {
            const resolver = new DefaultFilterResolver(injector);
            const filters = resolver.resolve(TestService);
            
            expect(filters).toHaveLength(0);
        });

        it('should throw error when adding null filter', () => {
            const resolver = new DefaultFilterResolver(injector);
            
            expect(() => {
                resolver.addFilter(TestService, null as any);
            }).toThrow();
        });
    });

    describe('DefaultFiterHandlerMethodResolver', () => {
        it('should create instance', () => {
            const resolver = new DefaultFiterHandlerMethodResolver(injector);
            expect(resolver).toBeInstanceOf(DefaultFiterHandlerMethodResolver);
        });

        it('should add and resolve handlers', () => {
            const resolver = new DefaultFiterHandlerMethodResolver(injector);
            const handler: Handler = {
                handle: (input: any) => `handled: ${input}`
            };
            
            resolver.addHandle(StringFilter, handler);
            const handlers = resolver.resolve(StringFilter);
            
            expect(handlers).toHaveLength(1);
            expect(handlers[0]).toBe(handler);
        });

        it('should add multiple handlers', () => {
            const resolver = new DefaultFiterHandlerMethodResolver(injector);
            const handler1: Handler = { handle: () => 'handler1' };
            const handler2: Handler = { handle: () => 'handler2' };
            
            resolver.addHandle(StringFilter, handler1);
            resolver.addHandle(StringFilter, handler2);
            const handlers = resolver.resolve(StringFilter);
            
            expect(handlers).toHaveLength(2);
        });

        it('should remove handler', () => {
            const resolver = new DefaultFiterHandlerMethodResolver(injector);
            const handler1: Handler = { handle: () => 'handler1' };
            const handler2: Handler = { handle: () => 'handler2' };
            
            resolver.addHandle(StringFilter, handler1);
            resolver.addHandle(StringFilter, handler2);
            resolver.removeHandle(StringFilter, handler1);
            const handlers = resolver.resolve(StringFilter);
            
            expect(handlers).toHaveLength(1);
        });

        it('should throw error when adding null handler', () => {
            const resolver = new DefaultFiterHandlerMethodResolver(injector);
            
            expect(() => {
                resolver.addHandle(StringFilter, null as any);
            }).toThrow();
        });
    });

    describe('Filter Implementation', () => {
        it('should filter string inputs', () => {
            const filter = new StringFilter();
            const handler: Handler<string, string> = {
                handle: (input: string) => `result: ${input}`
            };
            
            const result1 = filter.doFilter('test', handler, {} as RunContext);
            expect(result1).toBe('result: test');
            
            const result2 = filter.doFilter(123, handler, {} as RunContext);
            expect(result2).toBe('not a string');
        });

        it('should filter JSON object inputs', () => {
            const filter = new JsonFilter();
            const handler: Handler<any, string> = {
                handle: (input: any) => `result: ${JSON.stringify(input)}`
            };
            
            const result1 = filter.doFilter({ name: 'test' }, handler, {} as RunContext);
            expect(result1).toBe('result: {"name":"test"}');
            
            const result2 = filter.doFilter('string', handler, {} as RunContext);
            expect(result2).toBe('not a json object');
        });

        it('should execute before and after logic', () => {
            const filter = new LoggingFilter();
            const handler: Handler<any, string> = {
                handle: () => 'processed'
            };
            
            filter.doFilter({ data: 'test' }, handler, {} as RunContext);
            
            expect(filter.logs).toHaveLength(2);
        });
    });

    describe('composeFilters', () => {
        it('should compose filters in right-to-left order', () => {
            const upperFilter = new UppercaseFilter();
            const prefixFilter = new PrefixFilter();
            const finalHandler: Handler<string, string> = {
                handle: (input: string) => input
            };
            
            const composed = composeFilters([prefixFilter, upperFilter]);
            
            const result = composed('test', (input) => finalHandler.handle(input, {} as RunContext), {} as RunContext);
            expect(result).toBe('PREFIX_TEST');
        });

        it('should work with function filters', () => {
            const filterFn: FilterFn = (input: string, next: HandlerFn, context: any) => {
                return next('fn_' + input, context);
            };
            
            const result = filterFn('test', (input) => input, {} as RunContext);
            expect(result).toBe('fn_test');
        });

        it('should handle empty filter array', () => {
            const composed = composeFilters([]);
            const handler: Handler<string, string> = {
                handle: (input: string) => input
            };
            
            const result = composed('test', (input) => handler.handle(input, {} as RunContext), {} as RunContext);
            expect(result).toBe('test');
        });
    });
});