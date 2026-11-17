import { Injectable } from '@tsdi/ioc';
import * as jwt from 'jsonwebtoken';
import { createPublicKey, JsonWebKeyInput } from 'crypto';

/** Algorithms accepted when verifying with a shared secret. */
const HMAC_ALGORITHMS: jwt.Algorithm[] = ['HS256', 'HS384', 'HS512'];

@Injectable()
export class JWTService {
    // 解码JWT头部（增加错误处理）
    decodeHeader(token: string): any {
        try {
            const [header] = token.split('.');
            return JSON.parse(Buffer.from(header, 'base64url').toString());
        } catch (error) {
            throw new Error('Invalid JWT header');
        }
    }

    // 验证JWT签名（增加更多验证选项）
    async verify(token: string, options: {
        issuer?: string | string[];
        audience?: string | RegExp | Array<string | RegExp>;
        algorithms?: jwt.Algorithm[];
        publicKey?: string | Buffer;
        clockTolerance?: number;
    } = {}): Promise<any> {
        return new Promise((resolve, reject) => {
            const { publicKey, ...verifyOptions } = options;
            // When a shared secret is used, only accept HMAC algorithms: this
            // blocks algorithm-confusion attempts (for example an RS256 token
            // crafted so the public key is treated as an HMAC secret).
            const algorithms = verifyOptions.algorithms
                ?? (publicKey ? undefined : HMAC_ALGORITHMS);
            jwt.verify(token, publicKey || this.getDefaultKey(), {
                ...verifyOptions,
                algorithms,
                clockTolerance: options.clockTolerance || 30 // 默认30秒时钟容差
            }, (err, decoded) => {
                if (err) {
                    reject(new Error(`JWT verification failed: ${err.message}`));
                } else {
                    resolve(decoded);
                }
            });
        });
    }

    // 导入JWK格式的公钥（支持更多密钥类型）
    importKey(jwk: JsonWebKey): string | Buffer {
        try {
            if (jwk.kty === 'RSA' || jwk.kty === 'EC') {
                return createPublicKey({
                    key: jwk,
                    format: 'jwk'
                } as JsonWebKeyInput).export({ type: 'spki', format: 'pem' });
            }
            throw new Error(`Unsupported key type: ${jwk.kty}`);
        } catch (error: any) {
            throw new Error(`Failed to import key: ${error?.message}`);
        }
    }

    // 生成JWT（增加更多签名选项）
    async sign(payload: string | object | Buffer, options: Partial<jwt.SignOptions> & {
        privateKey?: string | Buffer;
    } = {}): Promise<string> {
        return new Promise((resolve, reject) => {
            const { privateKey, ...signOptions } = options;
            jwt.sign(payload, privateKey || this.getDefaultKey(), {
                ...signOptions,
                algorithm: options.algorithm || 'HS256' // 默认算法
            }, (err, token) => {
                if (err) {
                    reject(new Error(`JWT signing failed: ${err.message}`));
                } else {
                    resolve(token!);
                }
            });
        });
    }

    /**
     * Key used when the caller does not supply one.
     *
     * A built-in fallback secret makes every token forgeable, so it is only
     * allowed outside production; production deployments must provide
     * `JWT_SECRET` and get a hard failure instead of silently insecure tokens.
     */
    private getDefaultKey(): string {
        const secret = process.env.JWT_SECRET;
        if (secret) {
            return secret;
        }
        if (process.env.NODE_ENV === 'production') {
            throw new Error('JWT_SECRET is required in production; refusing to sign or verify with the built-in development secret.');
        }
        console.warn('Using the built-in development JWT secret - set JWT_SECRET before deploying.');
        return 'default-secret';
    }
}
