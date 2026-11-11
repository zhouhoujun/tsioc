import { HttpInterceptorFn } from '@tsdi/common/http';
import { catchError, throwError } from 'rxjs';
import { WORKFLOW_ADMIN_LOGIN_PATH } from './routes';

/**
 * Global HTTP interceptor. Any authenticated API call returning 401 sends the
 * browser to the login route; `/auth/*` calls keep their local error handling
 * (for example invalid credentials on the login form).
 */
export const workflowAdminUnauthorizedInterceptor: HttpInterceptorFn = (request, next, context) =>
    next(request, context).pipe(
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
