import * as http from 'http';
import { Inject, Injectable } from '@tsdi/ioc';
import { GATEWAY_CONFIG } from '../tokens';
import { GatewayConfig, defaultGatewayConfig } from '../contracts/GatewayConfig';

/**
 * Bearer token authentication for gateway requests.
 * Mirrors zeroclaw-gateway's bearer token + pairing code auth pattern.
 */
@Injectable()
export class AuthMiddleware {
    constructor(
        @Inject(GATEWAY_CONFIG, { nullable: true }) private config: GatewayConfig = defaultGatewayConfig
    ) {
    }

    /** Extract Bearer token from request */
    extractToken(req: http.IncomingMessage): string | null {
        // Authorization header
        const auth = req.headers['authorization'] as string | undefined;
        if (auth?.startsWith('Bearer ')) {
            return auth.slice(7).trim();
        }
        // Sec-WebSocket-Protocol: bearer.<token>
        const wsProtocol = req.headers['sec-websocket-protocol'] as string | undefined;
        if (wsProtocol) {
            for (const protocol of wsProtocol.split(/\s*,\s*/)) {
                if (protocol.startsWith('bearer.')) {
                    return protocol.slice(7).trim();
                }
            }
        }
        // Query parameter token=...
        const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
        const token = url.searchParams.get('token');
        if (token) return token;

        return null;
    }

    /** Verify token against configured auth token (or pairing override) */
    verify(token: string | null): boolean {
        if (!this.config.authToken) return true; // auth disabled
        if (!token) return false;
        return token === this.config.authToken;
    }

    /** Full auth check, returns 401 if unauthorized */
    authenticate(req: http.IncomingMessage, res: http.ServerResponse): boolean {
        if (this.config.authToken) {
            const token = this.extractToken(req);
            if (!token || !this.verify(token)) {
                res.writeHead(401, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'unauthorized' }));
                return false;
            }
        }
        return true;
    }
}
