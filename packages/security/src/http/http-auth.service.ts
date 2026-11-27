import * as crypto from 'crypto';
import * as http from 'http';
import * as jwt from 'jsonwebtoken';
import { Injectable } from '@tsdi/ioc';
import { JWTService } from '../jwt/jwt.service';

export interface HttpJwtAuthOptions {
    /** Static PEM/secret. Takes precedence over `jwksURI`. */
    publicKey?: string | Buffer;
    /** JWKS endpoint used to resolve rotating `kid` keys. */
    jwksURI?: string;
    /** JWKS cache lifetime in milliseconds. Default 5 minutes. */
    jwksCacheTtlMs?: number;
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

interface HttpJwksCacheEntry {
    keys: any[];
    fetchedAt: number;
}

const httpJwksCache = new Map<string, HttpJwksCacheEntry>();

/** Clear cached JWKS documents (tests / forced rotation). */
export function clearHttpAuthJwksCache(): void {
    httpJwksCache.clear();
}

@Injectable()
export class HttpAuthService {
    constructor(private jwtService: JWTService = new JWTService()) {
    }

    private async loadJwks(uri: string, ttlMs: number, force = false): Promise<any[]> {
        const cached = httpJwksCache.get(uri);
        const now = Date.now();
        if (!force && cached && now - cached.fetchedAt < ttlMs) {
            return cached.keys;
        }
        const response = await fetch(uri, { headers: { accept: 'application/json' } });
        if (!response.ok) {
            throw new Error(`JWKS request failed: HTTP ${response.status}`);
        }
        const body = await response.json() as { keys?: any[] };
        const keys = Array.isArray(body?.keys) ? body.keys : [];
        httpJwksCache.set(uri, { keys, fetchedAt: now });
        return keys;
    }

    private async resolveJwksKey(uri: string, ttlMs: number, token: string): Promise<string | Buffer> {
        const header = this.jwtService.decodeHeader(token);
        let keys = await this.loadJwks(uri, ttlMs);
        let key = keys.find((item: any) => !header.kid || item.kid === header.kid);
        if (!key) {
            // The provider may have rotated keys: refresh once before failing.
            keys = await this.loadJwks(uri, ttlMs, true);
            key = keys.find((item: any) => !header.kid || item.kid === header.kid);
        }
        if (!key) {
            throw new Error(`JWKS has no key for kid '${header.kid ?? ''}'`);
        }
        return this.jwtService.importKey(key);
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
            return false;
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
        const {
            jwksURI,
            jwksCacheTtlMs,
            ...verifyOptions
        } = options ?? {};
        if (!jwksURI || verifyOptions.publicKey) {
            return this.jwtService.verify(token, verifyOptions);
        }
        const ttl = jwksCacheTtlMs
            ?? (Number(process.env.HTTP_JWKS_CACHE_TTL_MS) || 5 * 60 * 1000);
        const publicKey = await this.resolveJwksKey(jwksURI, ttl, token);
        return this.jwtService.verify(token, { ...verifyOptions, publicKey });
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
