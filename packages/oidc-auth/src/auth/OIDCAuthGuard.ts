import { ContextToken, Injectable } from '@tsdi/ioc';
import { CanHandle } from '@tsdi/core';
import { RequestContext, StatusMessageAdapter } from '@tsdi/common';
import { OIDCService, SessionUser } from './OIDCService';

/**
 * Verified user attached to a request context by `OIDCAuthGuard`.
 */
export const OIDC_AUTH_USER = new ContextToken<SessionUser | null>(() => null);

function getHeader(input: any, context?: RequestContext): string | undefined {
    if (context) {
        try {
            const adapter = context.get(StatusMessageAdapter) as StatusMessageAdapter | null;
            const value = adapter?.getHeader?.('authorization');
            if (typeof value === 'string') {
                return value;
            }
        } catch {
            // adapter not registered for this transport
        }
    }
    const direct = typeof input?.getHeader === 'function' ? input.getHeader('authorization') : undefined;
    if (typeof direct === 'string') {
        return direct;
    }
    const headers = input?.headers as Record<string, unknown> | undefined;
    const raw = headers?.authorization ?? headers?.Authorization;
    if (typeof raw === 'string') {
        return raw;
    }
    if (Array.isArray(raw) && typeof raw[0] === 'string') {
        return raw[0];
    }
    return undefined;
}

function bearerToken(input: any, context?: RequestContext): string | null {
    const auth = getHeader(input, context);
    if (auth?.startsWith('Bearer ')) {
        return auth.slice(7).trim() || null;
    }
    return null;
}

/**
 * Route/message guard that verifies an access token issued by `OIDCService`.
 *
 * Usage:
 * ```ts
 * provideService(
 *   useRouter(),
 *   useGuards(OIDCAuthGuard),
 *   useHttpTransport({ ... })
 * )
 * ```
 *
 * Handlers can then read the verified user from `OIDC_AUTH_USER`.
 */
@Injectable()
export class OIDCAuthGuard implements CanHandle<any, RequestContext> {
    constructor(private readonly oidcService: OIDCService) {
    }

    async canHandle(input: any, context?: RequestContext): Promise<boolean> {
        const token = bearerToken(input, context);
        if (!token) {
            return false;
        }
        const verified = await this.oidcService.verifyAccessToken(token);
        if (!verified) {
            return false;
        }
        if (context) {
            context.set(OIDC_AUTH_USER, verified.user);
        }
        return true;
    }
}

/**
 * Read the verified user from a request context (or `null`).
 */
export function getOIDCAuthUser(context: RequestContext): SessionUser | null {
    try {
        return context.get(OIDC_AUTH_USER) as SessionUser | null;
    } catch {
        return null;
    }
}
