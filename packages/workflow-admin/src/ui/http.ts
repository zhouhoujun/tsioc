import { createInjector } from '@tsdi/ioc';
import { HttpClient, HttpInterceptorFn, provideHttpClient, withFetch, withInterceptors } from '@tsdi/common/http';
import { lastValueFrom, Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export const WORKFLOW_ADMIN_LOGIN_HASH = '#/login';

/**
 * Redirect protected API failures to the login route. Login/callback requests
 * are excluded so the login page can display its own error state.
 */
export const workflowAdminUnauthorizedInterceptor: HttpInterceptorFn = (request, next, context) =>
    next(request, context).pipe(catchError(error => {
        const status = Number(error?.status);
        const url = String((request as any)?.url || '');
        if (status === 401 && !/\/auth\/(login|callback)/.test(url) && typeof location !== 'undefined') {
            if (location.hash !== WORKFLOW_ADMIN_LOGIN_HASH) {
                location.hash = WORKFLOW_ADMIN_LOGIN_HASH;
            }
        }
        return throwError(() => error);
    }));

/** Create the framework HTTP client used by the admin UI shell. */
export function createWorkflowAdminHttpClient(): HttpClient {
    const injector = createInjector([
        ...provideHttpClient(withFetch(), withInterceptors([workflowAdminUnauthorizedInterceptor]))
    ] as any);
    return injector.get(HttpClient);
}

export function firstValue<T>(source: Observable<T>): Promise<T> {
    return lastValueFrom(source);
}
