import { token } from '@tsdi/ioc';
import { OIDCAuthModuleOptions } from '@tsdi/oidc-auth';

export const WORKFLOW_ADMIN_AUTH_OPTIONS = token<WorkflowAdminAuthOptions>('WORKFLOW_ADMIN_AUTH_OPTIONS');

/**
 * Authentication configuration for the workflow admin.
 *
 * `startOidcService` controls whether this server mounts the bundled OIDC/OAuth2
 * login endpoints. When disabled, the admin only verifies tokens issued by an
 * external `@tsdi/oidc-auth` service sharing the same jwt secret/issuer.
 */
export interface WorkflowAdminAuthOptions extends OIDCAuthModuleOptions {
    /** Enable API authentication. Default false. */
    enabled?: boolean;
    /** Mount `/auth/*` login/callback/session endpoints. Default true when enabled. */
    startOidcService?: boolean;
    /** External login page when `startOidcService` is false. */
    loginUrl?: string;
    /** Public callback URL; inferred from host/port when omitted. */
    callbackURL?: string;
}

function bool(value: string | undefined, fallback = false): boolean {
    if (value === undefined) {
        return fallback;
    }
    return value === '1' || value === 'true' || value === 'yes' || value === 'on';
}

function list(value: string | undefined, fallback: string[]): string[] {
    return value ? value.split(/[\s,]+/).filter(Boolean) : fallback;
}

export function resolveWorkflowAdminAuthOptions(
    options: WorkflowAdminAuthOptions | undefined,
    defaults: { host?: string; port?: number } = {}
): WorkflowAdminAuthOptions {
    const env = process.env;
    const enabled = options?.enabled ?? bool(env.WORKFLOW_ADMIN_AUTH_ENABLED ?? env.OIDC_AUTH_ENABLED);
    const host = defaults.host || env.WORKFLOW_ADMIN_HOST || '127.0.0.1';
    const port = defaults.port ?? Number(env.WORKFLOW_ADMIN_PORT || env.PORT || 8765);
    const callbackURL = options?.callbackURL
        || env.WORKFLOW_ADMIN_OIDC_CALLBACK_URL
        || env.OIDC_CALLBACK_URL
        || `http://${host}:${port}/auth/callback`;
    return {
        ...options,
        enabled,
        startOidcService: options?.startOidcService
            ?? bool(env.WORKFLOW_ADMIN_OIDC_SERVICE, true),
        loginUrl: options?.loginUrl || env.WORKFLOW_ADMIN_LOGIN_URL,
        callbackURL,
        clientId: options?.clientId || env.WORKFLOW_ADMIN_OIDC_CLIENT_ID || env.OIDC_CLIENT_ID,
        clientSecret: options?.clientSecret || env.WORKFLOW_ADMIN_OIDC_CLIENT_SECRET || env.OIDC_CLIENT_SECRET,
        authorizationURL: options?.authorizationURL || env.WORKFLOW_ADMIN_OIDC_AUTHORIZATION_URL || env.OIDC_AUTHORIZATION_URL,
        tokenURL: options?.tokenURL || env.WORKFLOW_ADMIN_OIDC_TOKEN_URL || env.OIDC_TOKEN_URL,
        profileURL: options?.profileURL || env.WORKFLOW_ADMIN_OIDC_PROFILE_URL || env.OIDC_PROFILE_URL,
        issuer: options?.issuer || env.WORKFLOW_ADMIN_OIDC_ISSUER || env.OIDC_ISSUER,
        jwksURI: options?.jwksURI || env.WORKFLOW_ADMIN_OIDC_JWKS_URI || env.OIDC_JWKS_URI,
        scope: options?.scope || list(env.WORKFLOW_ADMIN_OIDC_SCOPE || env.OIDC_SCOPE, ['openid', 'profile', 'email']),
        allowRegistration: options?.allowRegistration
            ?? bool(env.WORKFLOW_ADMIN_ALLOW_REGISTRATION ?? env.OIDC_ALLOW_REGISTRATION),
        jwt: {
            secret: options?.jwt?.secret || env.WORKFLOW_ADMIN_JWT_SECRET || env.OIDC_SESSION_SECRET || env.JWT_SECRET,
            issuer: options?.jwt?.issuer || env.WORKFLOW_ADMIN_JWT_ISSUER || env.OIDC_SESSION_ISSUER,
            algorithm: options?.jwt?.algorithm,
            sessionExpiresIn: options?.jwt?.sessionExpiresIn || env.WORKFLOW_ADMIN_SESSION_EXPIRES_IN,
            accessExpiresIn: options?.jwt?.accessExpiresIn,
            refreshExpiresIn: options?.jwt?.refreshExpiresIn
        }
    };
}
