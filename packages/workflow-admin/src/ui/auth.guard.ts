import { Inject, Injectable, token } from '@tsdi/ioc';
import { HttpClient } from '@tsdi/common/http';
import { ActivatedRouteSnapshot, CanActivate } from '@tsdi/components/router';
import { firstValue } from './http';

/** Injectable login route path used by the guard when a session is missing. */
export const WORKFLOW_ADMIN_LOGIN_ROUTE = token<string>('WORKFLOW_ADMIN_LOGIN_ROUTE');

/**
 * Route guard for `@tsdi/components/router`. Public routes bypass the check;
 * protected routes verify `/auth/session` through the framework HTTP client and
 * redirect the browser hash to the configured login route.
 */
@Injectable()
export class WorkflowAdminAuthGuard implements CanActivate {
    constructor(
        private readonly http: HttpClient,
        @Inject(WORKFLOW_ADMIN_LOGIN_ROUTE) private readonly loginRoute: string
    ) { }

    private redirectToLogin(): boolean {
        if (typeof location !== 'undefined') {
            const login = `#/${this.loginRoute}`;
            if (location.hash !== login) {
                location.hash = login;
            }
        }
        return false;
    }

    async canActivate(route: ActivatedRouteSnapshot): Promise<boolean> {
        if (route.data?.public === true) {
            return true;
        }
        try {
            const tokenResponse = await firstValue(this.http.get<{ token?: string; enabled?: boolean }>(
                '/auth/token',
                { withCredentials: true }
            ));
            if (tokenResponse?.enabled === false) {
                return true;
            }
            const token = tokenResponse?.token || '';
            if (!token) {
                return this.redirectToLogin();
            }
            const userResponse = await firstValue(this.http.get<{ user?: any }>(
                '/auth/userinfo',
                {
                    withCredentials: true,
                    headers: { authorization: `Bearer ${token}` }
                }
            ));
            if (userResponse?.user) {
                return true;
            }
        } catch {
            // Missing/invalid token or userinfo is treated as unauthenticated.
        }
        return this.redirectToLogin();
    }
}
