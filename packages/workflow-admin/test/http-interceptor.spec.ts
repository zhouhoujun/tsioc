import expect = require('expect');
import { throwError } from 'rxjs';
import { createWorkflowAdminUnauthorizedInterceptor } from '../src/ui/http-interceptor';
import { firstValue } from '../src/ui/http';

function withLocation<T>(hash: string, run: (location: { hash: string }) => Promise<T>): Promise<T> {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'location');
    const fake = { hash };
    Object.defineProperty(globalThis, 'location', { value: fake, configurable: true, writable: true });
    return run(fake).finally(() => {
        if (descriptor) {
            Object.defineProperty(globalThis, 'location', descriptor);
        } else {
            delete (globalThis as { location?: unknown }).location;
        }
    });
}

describe('workflow admin unauthorized interceptor', () => {
    it('redirects protected 401 responses to login when authentication is enabled', async () => {
        await withLocation('#/workflows', async location => {
            const interceptor = createWorkflowAdminUnauthorizedInterceptor(true);
            const next = () => throwError(() => ({ status: 401 }));
            await firstValue((interceptor as any)({ url: '/api/workflows' }, next)).catch(() => undefined);
            expect(location.hash).toBe('#/login');
        });
    });

    it('keeps open deployments on the current route when authentication is disabled', async () => {
        await withLocation('#/workflows', async location => {
            const interceptor = createWorkflowAdminUnauthorizedInterceptor(false);
            let calls = 0;
            const next = () => {
                calls += 1;
                return throwError(() => ({ status: 401 }));
            };
            await firstValue((interceptor as any)({ url: '/api/workflows' }, next)).catch(() => undefined);
            expect(calls).toBe(1);
            expect(location.hash).toBe('#/workflows');
        });
    });

    it('does not redirect auth endpoints even when authentication is enabled', async () => {
        await withLocation('#/login', async location => {
            const interceptor = createWorkflowAdminUnauthorizedInterceptor(true);
            const next = () => throwError(() => ({ status: 401 }));
            await firstValue((interceptor as any)({ url: '/auth/login' }, next)).catch(() => undefined);
            expect(location.hash).toBe('#/login');
        });
    });
});
