import { Injectable } from '@tsdi/ioc';
import { CanActivate } from '@tsdi/components/router';
import { redirectToAdminLogin } from './routing';

/** Session object bootstrapped into the HTML by the admin server. */
export interface GatewayAdminBootstrapSession {
    authenticated?: boolean;
    authEnabled?: boolean;
    user?: unknown;
}

interface SessionScope {
    __TSDI_ADMIN_SESSION__?: GatewayAdminBootstrapSession;
    window?: SessionScope;
}

/**
 * Route guard for the admin UI.
 *
 * Authentication is owned by the unified auth service: the admin server only
 * serves the SPA after resolving the OAuth token/user and injects that session
 * into `index.html`. The guard therefore never calls an auth/session API; it
 * just checks the injected session and redirects to the login page when it is
 * missing or has no user. Expired sessions are caught by the HTTP 401
 * interceptor on the next API call.
 */
@Injectable()
export class GatewayAdminAuthGuard implements CanActivate {
    canActivate(): boolean {
        const session = readBootstrapSession();
        const user = session?.user as { sub?: string; email?: string } | null | undefined;
        const hasUser = !!user && (!!user.sub || !!user.email);
        if (session?.authenticated && (hasUser || session.authEnabled === false)) {
            return true;
        }
        redirectToAdminLogin();
        return false;
    }
}

function readBootstrapSession(): GatewayAdminBootstrapSession | undefined {
    const scope = globalThis as unknown as SessionScope;
    return scope.window?.__TSDI_ADMIN_SESSION__ ?? scope.__TSDI_ADMIN_SESSION__;
}
