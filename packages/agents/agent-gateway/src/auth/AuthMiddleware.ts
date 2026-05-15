import * as http from 'http';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { HttpAuthService } from '@tsdi/security';
import { GATEWAY_CONFIG } from '../tokens';
import { GatewayConfig, defaultGatewayConfig } from '../contracts/GatewayConfig';

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

    /** Full auth check, returns 401 if unauthorized */
    async authenticate(req: http.IncomingMessage, res: http.ServerResponse): Promise<boolean> {
        const authOptions = this.config.auth ?? (this.config.authToken ? { bearerToken: this.config.authToken } : undefined);
        if (!authOptions) {
            return true;
        }
        const result = await this.httpAuth.authenticate(req, authOptions);
        if (!result.authenticated) {
            res.writeHead(401, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'unauthorized' }));
            return false;
        }
        return true;
    }
}
