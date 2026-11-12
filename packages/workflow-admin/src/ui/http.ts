import { createInjector } from '@tsdi/ioc';
import { HttpClient, HttpInterceptorFn, provideHttpClient, withFetch, withInterceptors } from '@tsdi/common/http';
import { lastValueFrom, Observable } from 'rxjs';
import { createWorkflowAdminUnauthorizedInterceptor } from './http-interceptor';

export const WORKFLOW_ADMIN_LOGIN_HASH = '#/login';

/** Authenticated interceptor alias kept for direct imports. */
export const workflowAdminUnauthorizedInterceptor: HttpInterceptorFn =
    createWorkflowAdminUnauthorizedInterceptor(true);

/**
 * Create the framework HTTP client used by the admin UI shell.
 * Pass `false` when authentication is disabled so 401s never redirect.
 */
export function createWorkflowAdminHttpClient(authEnabled = true): HttpClient {
    const injector = createInjector([
        ...provideHttpClient(withFetch(), withInterceptors([
            createWorkflowAdminUnauthorizedInterceptor(authEnabled)
        ]))
    ] as any);
    return injector.get(HttpClient);
}

export function firstValue<T>(source: Observable<T>): Promise<T> {
    return lastValueFrom(source);
}
