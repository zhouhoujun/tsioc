import { generateKeyPairSync } from 'crypto';
import * as jwt from 'jsonwebtoken';
import { JWTService } from '../src';
import expect = require('expect');

function withEnv<T>(name: string, value: string | undefined, fn: () => Promise<T>): Promise<T> {
    const original = process.env[name];
    if (value === undefined) {
        delete process.env[name];
    } else {
        process.env[name] = value;
    }
    return fn().finally(() => {
        if (original === undefined) {
            delete process.env[name];
        } else {
            process.env[name] = original;
        }
    });
}

describe('JWTService hardening', () => {

    it('refuses to use the development secret in production', async () => {
        await withEnv('NODE_ENV', 'production', async () => {
            await withEnv('JWT_SECRET', undefined, async () => {
                const service = new JWTService();
                await expect(service.sign({ sub: 'u' })).rejects.toThrow(/JWT_SECRET is required in production/);
            });
        });
    });

    it('signs and verifies with JWT_SECRET in production', async () => {
        await withEnv('NODE_ENV', 'production', async () => {
            await withEnv('JWT_SECRET', 'prod-secret', async () => {
                const service = new JWTService();
                const token = await service.sign({ sub: 'u' });
                const claims = await service.verify(token);
                expect(claims.sub).toBe('u');
            });
        });
    });

    it('falls back to the development secret outside production', async () => {
        await withEnv('NODE_ENV', 'test', async () => {
            await withEnv('JWT_SECRET', undefined, async () => {
                const service = new JWTService();
                const token = await service.sign({ sub: 'dev' });
                expect((await service.verify(token)).sub).toBe('dev');
            });
        });
    });

    it('rejects asymmetric tokens when verifying with a shared secret', async () => {
        const { privateKey, publicKey } = generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        // An attacker signs with RS256 and hopes the verifier treats the public
        // key as an HMAC secret (classic algorithm-confusion attack).
        const forged = jwt.sign({ sub: 'admin' }, privateKey, { algorithm: 'RS256' });

        await withEnv('JWT_SECRET', publicKey, async () => {
            const service = new JWTService();
            await expect(service.verify(forged)).rejects.toThrow(/JWT verification failed/);
        });
    });

    it('verifies asymmetric tokens when the public key is supplied', async () => {
        const { privateKey, publicKey } = generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        const token = jwt.sign({ sub: 'svc' }, privateKey, { algorithm: 'RS256' });

        const service = new JWTService();
        const claims = await service.verify(token, { publicKey, algorithms: ['RS256'] });

        expect(claims.sub).toBe('svc');
    });

});
