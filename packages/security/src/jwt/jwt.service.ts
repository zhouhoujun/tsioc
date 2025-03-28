import { Injectable } from '@tsdi/ioc';
import * as jwt from 'jsonwebtoken';
import { createPublicKey, createPrivateKey, JsonWebKeyInput } from 'crypto';

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
            jwt.verify(token, options.publicKey || this.getDefaultKey(), {
                ...options,
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
            jwt.sign(payload, options.privateKey || this.getDefaultKey(), {
                ...options,
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

    // 默认密钥（增加环境变量检查）
    private getDefaultKey(): string {
        if (!process.env.JWT_SECRET) {
            console.warn('Using default JWT secret - not recommended for production');
        }
        return process.env.JWT_SECRET || 'default-secret';
    }
}
