import { Injectable, Injector, createInjector, Module, Abstract, HandleResult } from '@tsdi/ioc';
import { Observable, of } from 'rxjs';
import expect = require('expect');
import { CanHandle, GuardLike, GUARDS_TOKEN } from '../src/guard';

@Injectable()
class SimpleGuard implements CanHandle {
    canHandle(input: any): HandleResult<boolean> {
        return input !== null && input !== undefined;
    }
}

@Injectable()
class StringGuard implements CanHandle<string> {
    canHandle(input: string): HandleResult<boolean> {
        return input.length > 0;
    }
}

@Injectable()
class AsyncGuard implements CanHandle {
    async canHandle(input: any): Promise<boolean> {
        return new Promise(resolve => {
            setTimeout(() => resolve(input > 0), 10);
        });
    }
}

@Injectable()
class ObservableGuard implements CanHandle {
    canHandle(input: any): Observable<boolean> {
        return of(typeof input === 'number');
    }
}

@Injectable()
class ContextGuard implements CanHandle<any, { user?: string }> {
    canHandle(input: any, context?: { user?: string }): HandleResult<boolean> {
        return context?.user === 'admin';
    }
}

const guardFn: GuardLike = (input: any) => input !== null;

@Abstract()
abstract class TestService {
    abstract process(data: string): string;
}

@Module({
    providers: [
        SimpleGuard,
        StringGuard,
        AsyncGuard,
        ObservableGuard,
        ContextGuard
    ]
})
class TestModule { }

describe('Guard Tests', () => {
    let injector: Injector;

    beforeEach(() => {
        injector = createInjector();
    });

    describe('CanHandle Interface', () => {
        it('should return true for valid input', () => {
            const guard = new SimpleGuard();
            const result = guard.canHandle('test');
            expect(result).toBeTruthy();
        });

        it('should return false for null input', () => {
            const guard = new SimpleGuard();
            const result = guard.canHandle(null);
            expect(result).toBeFalsy();
        });

        it('should return false for undefined input', () => {
            const guard = new SimpleGuard();
            const result = guard.canHandle(undefined);
            expect(result).toBeFalsy();
        });
    });

    describe('StringGuard', () => {
        it('should return true for non-empty strings', () => {
            const guard = new StringGuard();
            expect(guard.canHandle('test')).toBeTruthy();
        });

        it('should return false for empty strings', () => {
            const guard = new StringGuard();
            expect(guard.canHandle('')).toBeFalsy();
        });
    });

    describe('AsyncGuard', () => {
        it('should handle async guards with positive numbers', async () => {
            const guard = new AsyncGuard();
            const result = await guard.canHandle(5);
            expect(result).toBeTruthy();
        });

        it('should handle async guards with zero', async () => {
            const guard = new AsyncGuard();
            const result = await guard.canHandle(0);
            expect(result).toBeFalsy();
        });

        it('should handle async guards with negative numbers', async () => {
            const guard = new AsyncGuard();
            const result = await guard.canHandle(-5);
            expect(result).toBeFalsy();
        });
    });

    describe('ObservableGuard', () => {
        it('should return observable for number input', (done) => {
            const guard = new ObservableGuard();
            guard.canHandle(42).subscribe((result: boolean) => {
                expect(result).toBeTruthy();
                done();
            });
        });

        it('should return false for string input', (done) => {
            const guard = new ObservableGuard();
            guard.canHandle('test').subscribe((result: boolean) => {
                expect(result).toBeFalsy();
                done();
            });
        });
    });

    describe('ContextGuard', () => {
        it('should return true for admin context', () => {
            const guard = new ContextGuard();
            const result = guard.canHandle({}, { user: 'admin' });
            expect(result).toBeTruthy();
        });

        it('should return false for non-admin context', () => {
            const guard = new ContextGuard();
            const result = guard.canHandle({}, { user: 'user' });
            expect(result).toBeFalsy();
        });

        it('should return false when no context', () => {
            const guard = new ContextGuard();
            const result = guard.canHandle({});
            expect(result).toBeFalsy();
        });
    });

    describe('GuardLike Type', () => {
        it('should accept function guards', () => {
            expect(guardFn('test')).toBeTruthy();
            expect(guardFn(null)).toBeFalsy();
        });
    });

    describe('GUARDS_TOKEN', () => {
        it('should be a valid token', () => {
            expect(GUARDS_TOKEN.toString()).toContain('GUARDS_TOKEN');
        });
    });
});