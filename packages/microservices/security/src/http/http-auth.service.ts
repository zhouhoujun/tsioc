import * as crypto from 'crypto';
import * as http from 'http';
import * as jwt from 'jsonwebtoken';
import { Injectable } from '@tsdi/ioc';
import { JWTService } from '../jwt/jwt.service';

export interface HttpJwtAuthOptions {
    publicKey?: string | Buffer;
    issuer?: string | string[];
    audience?: string | RegExp | Array<string | RegExp>;
    algorithms?: jwt.Algorithm[];
    clockTolerance?: number;
}

export interface HttpAuthOptions {
    bearerToken?: string;
    jwt?: HttpJwtAuthOptions;
    tokenQueryName?: string;
    allowQueryToken?: boolean;
    allowWebSocketProtocolToken?: boolean;
}

@Injectable()
export class HttpAuthService {
    constructor(private jwtService: JWTService = new JWTService()) {
    }

    extractToken(req: http.IncomingMessage, options: HttpAuthOptions = {}): string | null {
        const auth = req.headers['authorization'] as string | undefined;
        if (auth?.startsWith('Bearer ')) {
            return auth.slice(7).trim();
        }

        if (options.allowWebSocketProtocolToken !== false) {
            const wsProtocol = req.headers['sec-websocket-protocol'] as string | undefined;
            if (wsProtocol) {
                for (const protocol of wsProtocol.split(/\s*,\s*/)) {
                    if (protocol.startsWith('bearer.')) {
                        return protocol.slice(7).trim();
                    }
                }
            }
        }

        if (options.allowQueryToken !== false) {
            const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
            const token = url.searchParams.get(options.tokenQueryName ?? 'token');
            if (token) {
                return token;
            }
        }

        return null;
    }

    verifyBearerToken(token: string | null, expectedToken?: string): boolean {
        if (!expectedToken) {
            return true;
        }
        if (!token) {
            return false;
        }
        const actual = Buffer.from(token);
        const expected = Buffer.from(expectedToken);
        if (actual.length !== expected.length) {
            return false;
        }
        return crypto.timingSafeEqual(actual, expected);
    }

    async verifyJwtToken(token: string | null, options?: HttpJwtAuthOptions): Promise<any> {
        if (!token) {
            return null;
        }
        return this.jwtService.verify(token, options);
    }

    async authenticate(req: http.IncomingMessage, options: HttpAuthOptions = {}): Promise<{ authenticated: boolean; token: string | null; claims?: any }> {
        const token = this.extractToken(req, options);
        if (!options.bearerToken && !options.jwt) {
            return {
                authenticated: true,
                token
            };
        }

        if (options.bearerToken && this.verifyBearerToken(token, options.bearerToken)) {
            return {
                authenticated: true,
                token
            };
        }

        if (options.jwt) {
            try {
                const claims = await this.verifyJwtToken(token, options.jwt);
                if (claims) {
                    return {
                        authenticated: true,
                        token,
                        claims
                    };
                }
            } catch {
            }
        }

        return {
            authenticated: false,
            token
        };
    }
}
