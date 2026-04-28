import { Injectable } from '@tsdi/ioc';
import { OIDCOptions } from './oidc.options';
import { OAuth2Service } from '../oauth2/oauth2.service';
import { JWTService } from '../jwt/jwt.service';

@Injectable()
export class OIDCService extends OAuth2Service {
    constructor(private jwtService: JWTService) {
        super();
    }

    // 新增方法：获取JWKS公钥
    private async getPublicKey(kid: string, options: OIDCOptions): Promise<string|Buffer> {
        if (!options.jwksURI) {
            throw new Error('JWKS URI not configured');
        }
        
        const jwks = await fetch(options.jwksURI).then(res => res.json());
        const key = jwks.keys.find((k: any) => k.kid === kid);
        
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
        if (decoded.aud !== options.clientId) {
            throw new Error('Invalid audience');
        }
    }

    async getUserInfo(accessToken: string, options: OIDCOptions): Promise<any> {
        // 获取用户信息端点
        const userInfo = await super.getUserInfo(accessToken, options);
        
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
