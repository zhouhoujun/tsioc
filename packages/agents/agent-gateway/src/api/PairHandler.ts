import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { GatewayRoute, RouteHandler } from '../contracts/GatewayRoute';
import { GATEWAY_CONFIG } from '../tokens';
import { GatewayConfig, defaultGatewayConfig } from '../contracts/GatewayConfig';
import { PairingStore } from '../auth/PairingStore';
import { buildPairingUrls } from '../auth/pairing-urls';
import { GatewayServer } from '../gateway/GatewayServer';

/**
 * Pairing endpoints for the browser console.
 *
 * - `POST /api/pair` redeems a one-time code for the gateway bearer token. It
 *   is deliberately unauthenticated (the browser has no token yet) but
 *   rate-limited and single-use with a 5 minute TTL.
 * - `POST /api/pair/create` mints a code for an authenticated terminal/TUI.
 */
@Injectable()
export class PairHandler {
    constructor(
        private pairing: PairingStore,
        private gateway: GatewayServer,
        @Optional() @Inject(GATEWAY_CONFIG) private config: GatewayConfig = defaultGatewayConfig
    ) {
    }

    getRoutes(): GatewayRoute[] {
        const redeem: RouteHandler = async (_req, res, _params, body) => {
            const code = String(body?.code || '').trim();
            if (!code || !this.pairing.validate(code)) {
                res.writeHead(401, { 'Content-Type': 'application/json' })
                    .end(JSON.stringify({ error: 'invalid or expired pairing code' }));
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({ token: this.config.authToken || '' }));
        };
        const create: RouteHandler = async (_req, res) => {
            const entry = this.pairing.generate();
            res.writeHead(200, { 'Content-Type': 'application/json' })
                .end(JSON.stringify({
                    code: entry.code,
                    expiresAt: entry.expiresAt,
                    urls: buildPairingUrls(this.config, entry.code, this.gateway.address()?.port)
                }));
        };
        return [
            { method: 'POST', path: '/api/pair', handler: redeem, auth: false },
            { method: 'POST', path: '/api/pair/create', handler: create }
        ];
    }
}
