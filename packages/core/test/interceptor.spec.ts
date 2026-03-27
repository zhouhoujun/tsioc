import { Injectable, Injector, createInjector, Module, Abstract, isString } from '@tsdi/ioc';
import expect = require('expect');
import { Application, ApplicationContext, Interceptor, InterceptorResolver, RunContext, Handler } from '../src';
import { DefaultInterceptorResolver } from '../src/filters/filter.impl';

@Injectable()
class TestInterceptor implements Interceptor {
    intercept(input: any, next: Handler<any, any>, context: RunContext) {
        if (isString(input)) {
            input = 'intercepted: ' + input;
        }
        return next.handle(input, context);
    }
}

@Injectable()
class LoggingInterceptor implements Interceptor {
    logs: string[] = [];
    
    intercept(input: any, next: Handler<any, any>, context: RunContext) {
        this.logs.push(`before: ${input}`);
        const result = next.handle(input, context);
        this.logs.push(`after: ${result}`);
        return result;
    }
}

@Injectable()
class ErrorInterceptor implements Interceptor {
    intercept(input: any, next: Handler<any, any>, context: RunContext) {
        try {
            return next.handle(input, context);
        } catch (error) {
            return `error handled: ${error}`;
        }
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
        TestInterceptor,
        LoggingInterceptor,
        ErrorInterceptor,
        TestServiceImpl
    ]
})
class TestModule { }

describe('Interceptor Tests', () => {
    let injector: Injector;

    beforeEach(() => {
        injector = createInjector();
    });

    describe('DefaultInterceptorResolver', () => {
        it('should create instance', () => {
            const resolver = new DefaultInterceptorResolver(injector);
            expect(resolver).toBeInstanceOf(DefaultInterceptorResolver);
        });

        it('should add and resolve interceptors', () => {
            const resolver = new DefaultInterceptorResolver(injector);
            const interceptor = new TestInterceptor();
            
            resolver.addInterceptor(TestService, interceptor);
            const interceptors = resolver.resolve(TestService);
            
            expect(interceptors).toHaveLength(1);
            expect(interceptors[0]).toBe(interceptor);
        });

        it('should add multiple interceptors', () => {
            const resolver = new DefaultInterceptorResolver(injector);
            const interceptor1 = new TestInterceptor();
            const interceptor2 = new LoggingInterceptor();
            
            resolver.addInterceptor(TestService, interceptor1);
            resolver.addInterceptor(TestService, interceptor2);
            const interceptors = resolver.resolve(TestService);
            
            expect(interceptors).toHaveLength(2);
            expect(interceptors[0]).toBe(interceptor1);
            expect(interceptors[1]).toBe(interceptor2);
        });

        it('should not add duplicate interceptors', () => {
            const resolver = new DefaultInterceptorResolver(injector);
            const interceptor = new TestInterceptor();
            
            resolver.addInterceptor(TestService, interceptor);
            resolver.addInterceptor(TestService, interceptor);
            const interceptors = resolver.resolve(TestService);
            
            expect(interceptors).toHaveLength(1);
        });

        it('should remove interceptor', () => {
            const resolver = new DefaultInterceptorResolver(injector);
            const interceptor1 = new TestInterceptor();
            const interceptor2 = new LoggingInterceptor();
            
            resolver.addInterceptor(TestService, interceptor1);
            resolver.addInterceptor(TestService, interceptor2);
            resolver.removeInterceptor(TestService, interceptor1);
            const interceptors = resolver.resolve(TestService);
            
            expect(interceptors).toHaveLength(1);
            expect(interceptors[0]).toBe(interceptor2);
        });

        it('should resolve by string key', () => {
            const resolver = new DefaultInterceptorResolver(injector);
            const interceptor = new TestInterceptor();
            
            resolver.addInterceptor('testKey', interceptor);
            const interceptors = resolver.resolve('testKey');
            
            expect(interceptors).toHaveLength(1);
            expect(interceptors[0]).toBe(interceptor);
        });

        it('should return empty array for unresolved target', () => {
            const resolver = new DefaultInterceptorResolver(injector);
            const interceptors = resolver.resolve(TestService);
            
            expect(interceptors).toHaveLength(0);
        });

        it('should throw error when adding null interceptor', () => {
            const resolver = new DefaultInterceptorResolver(injector);
            
            expect(() => {
                resolver.addInterceptor(TestService, null as any);
            }).toThrow();
        });
    });

    describe('Interceptor Implementation', () => {
        it('should intercept and modify input', () => {
            const interceptor = new TestInterceptor();
            const handler: Handler<string, string> = {
                handle: (input: string) => `result: ${input}`
            };
            
            const result = interceptor.intercept('test', handler, {} as RunContext);
            expect(result).toBe('result: intercepted: test');
        });

        it('should execute before and after logic', () => {
            const interceptor = new LoggingInterceptor();
            const handler: Handler<string, string> = {
                handle: (input: string) => `processed`
            };
            
            interceptor.intercept('input', handler, {} as RunContext);
            
            expect(interceptor.logs).toHaveLength(2);
            expect(interceptor.logs[0]).toBe('before: input');
            expect(interceptor.logs[1]).toBe('after: processed');
        });

        it('should handle errors in interceptors', () => {
            const interceptor = new ErrorInterceptor();
            const handler: Handler<string, string> = {
                handle: () => { throw new Error('test error'); }
            };
            
            const result = interceptor.intercept('test', handler, {} as RunContext);
            expect(result).toBe('error handled: Error: test error');
        });
    });
});