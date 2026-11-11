import { ContextToken, Inject, Injectable } from '@tsdi/ioc';
import { CanHandle } from '@tsdi/core';
import { RequestContext } from '@tsdi/common';
import { RestfulRequestAdapter } from '@tsdi/common';
import { OIDCService, SessionUser } from '@tsdi/oidc-auth';
import { WORKFLOW_ADMIN_AUTH_OPTIONS, WorkflowAdminAuthOptions } from './options';

export const WORKFLOW_ADMIN_USER = new ContextToken<SessionUser | null>(() => null);

function cookieValue(adapter: any, input: any, name: string): string | undefined {
    const fromAdapter = adapter?.cookies?.get?.(name);
    if (fromAdapter) {
        return fromAdapter;
    }
    const header = adapter?.getHeader?.('cookie')
        ?? adapter?.request?.headers?.cookie
        ?? input?.headers?.cookie;
    const raw = Array.isArray(header) ? header.join('; ') : header;
    if (typeof raw !== 'string' || !raw) {
        return undefined;
    }
    for (const part of raw.split(';')) {
        const index = part.indexOf('=');
        if (index < 0) {
            continue;
        }
        if (part.slice(0, index).trim() === name) {
            return decodeURIComponent(part.slice(index + 1).trim());
        }
    }
    return undefined;
}

function bearerToken(adapter: any): string | undefined {
    const header = adapter?.getHeader?.('authorization')
        ?? adapter?.request?.headers?.authorization
        ?? adapter?.request?.headers?.Authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
        return header.slice(7).trim();
    }
    return undefined;
}

function requestPath(adapter: any): string {
    return String(adapter?.path || adapter?.url || adapter?.request?.url || '');
}

/**
 * Protects `/api/*` routes with a local session cookie or bearer token issued by
 * the configured OIDC service. Static files and `/auth/*` stay public so the
 * login page can load.
 */
@Injectable()
export class WorkflowSessionGuard implements CanHandle<any, RequestContext> {
    constructor(
        private readonly oidc: OIDCService,
        @Inject(WORKFLOW_ADMIN_AUTH_OPTIONS) private readonly options: WorkflowAdminAuthOptions
    ) { }

    canHandle(input: any, context?: RequestContext): boolean | Promise<boolean> {
        if (!this.options?.enabled) {
            return true;
        }
        const adapter = context?.get(RestfulRequestAdapter) as any;
        const route = requestPath(adapter) || requestPath(input);
        if (!route.startsWith('/api')) {
            return true;
        }
        const token = bearerToken(adapter) || cookieValue(adapter, input, 'oidc_session');
        if (!token) {
            return false;
        }
        return this.verify(token, context);
    }

    private async verify(token: string, context?: RequestContext): Promise<boolean> {
        const user = await this.oidc.verifySessionToken(token)
            ?? (await this.oidc.verifyAccessToken(token))?.user
            ?? null;
        if (!user) {
            return false;
        }
        context?.set(WORKFLOW_ADMIN_USER, user);
        return true;
    }
}
