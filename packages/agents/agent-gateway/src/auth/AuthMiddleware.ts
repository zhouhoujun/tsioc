import * as crypto from 'crypto';
import * as http from 'http';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { HttpAuthService } from '@tsdi/security';
import { GATEWAY_CONFIG } from '../tokens';
import { GatewayApproverToken, GatewayConfig, defaultGatewayConfig } from '../contracts/GatewayConfig';

export interface GatewayRequestAuth {
    token: string | null;
    claims?: any;
    principalId?: string;
    /** `approver` serves third-party approval calls only. */
    role?: 'owner' | 'approver';
}

const LOCAL_PRINCIPAL_ID = 'gateway-local';

/** `TSDI_AGENT_APPROVER_TOKENS="ci=token1,ops=token2"`. */
export function parseApproverTokens(raw?: string): GatewayApproverToken[] {
    return String(raw || '')
        .split(',')
        .map(entry => entry.trim())
        .filter(Boolean)
        .map(entry => {
            const separator = entry.indexOf('=');
            const id = (separator > 0 ? entry.slice(0, separator) : '').trim();
            const token = (separator > 0 ? entry.slice(separator + 1) : '').trim();
            return id && token ? { id, token } : undefined;
        })
        .filter((entry): entry is GatewayApproverToken => !!entry);
}

function timingSafeEqual(expected: string, actual: string): boolean {
    const left = Buffer.from(expected);
    const right = Buffer.from(actual);
    return left.length === right.length && crypto.timingSafeEqual(left, right);
}
const REQUEST_AUTH = Symbol('gateway-request-auth');

type AuthenticatedRequest = http.IncomingMessage & {
    [REQUEST_AUTH]?: GatewayRequestAuth;
};

export function getRequestAuth(req: http.IncomingMessage): GatewayRequestAuth | undefined {
    return (req as AuthenticatedRequest)[REQUEST_AUTH];
}

export function getRequestPrincipalId(req: http.IncomingMessage): string | undefined {
    return getRequestAuth(req)?.principalId;
}

export function setRequestAuth(req: http.IncomingMessage, auth?: GatewayRequestAuth): void {
    const request = req as AuthenticatedRequest;
    if (!auth) {
        delete request[REQUEST_AUTH];
        return;
    }
    request[REQUEST_AUTH] = auth;
}

/**
 * Bearer token authentication for gateway requests.
 * Mirrors zeroclaw-gateway's bearer token + pairing code auth pattern.
 */
@Injectable()
export class AuthMiddleware {
    constructor(
        private httpAuth: HttpAuthService,
        @Optional() @Inject(GATEWAY_CONFIG) private config: GatewayConfig = defaultGatewayConfig
    ) {
    }

    /** Extract Bearer token from request */
    extractToken(req: http.IncomingMessage): string | null {
        return this.httpAuth.extractToken(req);
    }

    /** Verify token against configured auth token (or pairing override) */
    verify(token: string | null): boolean {
        const authOptions = this.config.auth ?? (this.config.authToken ? { bearerToken: this.config.authToken } : undefined);
        if (!authOptions) {
            return true;
        }
        if (!authOptions.bearerToken) {
            return !authOptions.jwt;
        }
        return this.httpAuth.verifyBearerToken(token, authOptions.bearerToken);
    }

    /** Configured approvers (config wins; environment is the deployment fallback). */
    approvers(): GatewayApproverToken[] {
        if (this.config.approvers?.length) {
            return this.config.approvers;
        }
        return parseApproverTokens((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.TSDI_AGENT_APPROVER_TOKENS);
    }

    /** Match a bearer token against the approver list (timing-safe). */
    matchApprover(token: string | null): GatewayApproverToken | undefined {
        if (!token) {
            return undefined;
        }
        return this.approvers().find(approver => approver.token && timingSafeEqual(approver.token, token));
    }

    /** Full auth check, returns 401 if unauthorized */
    async authenticate(req: http.IncomingMessage, res: http.ServerResponse): Promise<boolean> {
        const approver = this.matchApprover(this.extractToken(req));
        if (approver) {
            setRequestAuth(req, {
                token: approver.token,
                principalId: `approver:${approver.id}`,
                role: 'approver'
            });
            return true;
        }
        const authOptions = this.config.auth ?? (this.config.authToken ? { bearerToken: this.config.authToken } : undefined);
        if (!authOptions) {
            setRequestAuth(req, {
                token: null,
                principalId: LOCAL_PRINCIPAL_ID,
                role: 'owner'
            });
            return true;
        }
        const result = await this.httpAuth.authenticate(req, authOptions);
        if (!result.authenticated) {
            setRequestAuth(req, undefined);
            res.writeHead(401, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'unauthorized' }));
            return false;
        }
        setRequestAuth(req, {
            token: result.token,
            claims: result.claims,
            principalId: this.resolvePrincipalId(result.token, result.claims)
        });
        return true;
    }

    private resolvePrincipalId(token: string | null, claims?: any): string | undefined {
        const subject = claims?.sub;
        if (typeof subject === 'string' && subject) {
            return subject;
        }
        if (token) {
            return crypto.createHash('sha256').update(token).digest('hex');
        }
        return undefined;
    }
}
