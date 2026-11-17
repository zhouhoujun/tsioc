import { Injectable } from '@tsdi/ioc';
import { fetch } from 'cross-fetch';
import { OIDCOptions } from './oidc.options';
import { OAuth2Service } from '../oauth2/oauth2.service';
import { JWTService } from '../jwt/jwt.service';

/** Default lifetime of a cached JWKS document. */
const DEFAULT_JWKS_TTL_MS = 5 * 60 * 1000;

interface JwksCacheEntry {
    keys: any[];
    fetchedAt: number;
}

const jwksCache = new Map<string, JwksCacheEntry>();

/** Drop every cached JWKS document (forced key refresh). */
export function clearJwksCache(): void {
    jwksCache.clear();
}

function jwksTtlMs(): number {
    const configured = Number(process.env.OIDC_JWKS_CACHE_TTL_MS);
    return Number.isFinite(configured) && configured >= 0 ? configured : DEFAULT_JWKS_TTL_MS;
}

@Injectable()
export class OIDCService extends OAuth2Service {
    constructor(private jwtService: JWTService) {
        super();
    }

    /**
     * Load the JWKS document, reusing a cached copy until it expires.
     *
     * Without the cache every ID-token validation performed an HTTP request,
     * which adds a full round trip to each login and hammers the provider.
     */
    private async loadJwks(uri: string, force = false): Promise<any[]> {
        const cached = jwksCache.get(uri);
        const now = Date.now();
        if (!force && cached && now - cached.fetchedAt < jwksTtlMs()) {
            return cached.keys;
        }
        const jwks = await fetch(uri).then(res => res.json());
        const keys = Array.isArray(jwks?.keys) ? jwks.keys : [];
        jwksCache.set(uri, { keys, fetchedAt: now });
        return keys;
    }

    // 新增方法：获取JWKS公钥
    private async getPublicKey(kid: string, options: OIDCOptions): Promise<string|Buffer> {
        if (!options.jwksURI) {
            throw new Error('JWKS URI not configured');
        }

        let keys = await this.loadJwks(options.jwksURI);
        let key = keys.find((k: any) => k.kid === kid);
        if (!key) {
            // The provider may have rotated its keys: refresh once before failing.
            keys = await this.loadJwks(options.jwksURI, true);
            key = keys.find((k: any) => k.kid === kid);
        }

        if (!key) {
            throw new Error('Public key not found');
        }

        return this.jwtService.importKey(key);
    }

    async validateIDToken(idToken: string, options: OIDCOptions): Promise<any> {
        // 解码header获取kid
        const header = this.jwtService.decodeHeader(idToken);
        
        // 获取对应的公钥
        const publicKey = await this.getPublicKey(header.kid, options);
        
        // 验证ID Token签名和claims
        const decoded = await this.jwtService.verify(idToken, {
            issuer: options.issuer,
            audience: options.clientId,
            algorithms: ['RS256'],
            publicKey
        });
        
        // 验证标准claims
        this.validateStandardClaims(decoded, options);
        
        return decoded;
    }

    private validateStandardClaims(decoded: any, options: OIDCOptions) {
        const now = Math.floor(Date.now() / 1000);
        
        // 验证exp (过期时间)
        if (decoded.exp && decoded.exp < now) {
            throw new Error('Token expired');
        }
        
        // 验证iat (签发时间)
        if (decoded.iat && decoded.iat > now) {
            throw new Error('Token issued in the future');
        }
        
        // 验证iss (签发者)
        if (decoded.iss !== options.issuer) {
            throw new Error('Invalid issuer');
        }
        
        // 验证aud (受众)
        const audiences = Array.isArray(decoded.aud) ? decoded.aud : [decoded.aud];
        if (!audiences.includes(options.clientId)) {
            throw new Error('Invalid audience');
        }
    }

    async getUserInfo(accessToken: string, options: OIDCOptions): Promise<any> {
        const userInfo = await super.fetchUserInfo(accessToken, options);
        
        // 添加OIDC标准claims处理
        return {
            ...userInfo,
            sub: userInfo.sub || userInfo.id,
            // 标准化其他claims
            email_verified: userInfo.email_verified || false,
            phone_number_verified: userInfo.phone_number_verified || false
        };
    }
}
