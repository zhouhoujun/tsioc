import { HttpInterceptorFn } from '@tsdi/common/http';
import { catchError, throwError } from 'rxjs';
import { WORKFLOW_ADMIN_LOGIN_PATH } from './routes';

/**
 * Build the global HTTP interceptor.
 *
 * When authentication is enabled any protected API call returning 401 sends
 * the browser to the login route; `/auth/*` calls keep their local error
 * handling (for example invalid credentials on the login form). When
 * authentication is disabled the interceptor is a pure pass-through so open
 * deployments never bounce to a login page that does not exist.
 */
export function createWorkflowAdminUnauthorizedInterceptor(authEnabled: boolean): HttpInterceptorFn {
    return (request, next, context) => {
        if (!authEnabled) {
            return next(request, context);
        }
        return next(request, context).pipe(
            catchError(error => {
                const status = Number(error?.status) || 0;
                const url = String(request?.url || '');
                if (status === 401 && !url.includes('/auth/') && typeof location !== 'undefined') {
                    const login = `#/${WORKFLOW_ADMIN_LOGIN_PATH}`;
                    if (location.hash !== login) {
                        location.hash = login;
                    }
                }
                return throwError(() => error);
            })
        );
    };
}

/** Default (authenticated) interceptor, kept for direct imports. */
export const workflowAdminUnauthorizedInterceptor = createWorkflowAdminUnauthorizedInterceptor(true);
