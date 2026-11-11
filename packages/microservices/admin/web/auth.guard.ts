import { Injectable } from '@tsdi/ioc';
import { CanActivate, ActivatedRouteSnapshot } from '@tsdi/components/router';
import { GatewayAdminHttp } from './http';
import { redirectToAdminLogin } from './routing';

/**
 * Route guard for the admin UI.
 *
 * The browser shell renders before the auth API is called, so the guard probes
 * the admin state endpoint once per session. A `401` redirects to the login
 * page with a return URL; other failures leave the shell usable and let the
 * normal API error handling surface the problem.
 */
@Injectable()
export class GatewayAdminAuthGuard implements CanActivate {
    private authenticated?: boolean;

    constructor(private http: GatewayAdminHttp) { }

    async canActivate(_route?: ActivatedRouteSnapshot): Promise<boolean> {
        if (this.authenticated === true) {
            return true;
        }
        const response = await this.http.state();
        if (response.status === 401) {
            this.authenticated = false;
            redirectToAdminLogin();
            return false;
        }
        if (response.ok) {
            this.authenticated = true;
        }
        return true;
    }
}
