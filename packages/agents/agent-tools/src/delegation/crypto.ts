import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { Buffer } from 'buffer';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

export interface DelegationCipher {
    encrypt(value: string): string;
    decrypt(payload: string): string;
}

function splitPayload(payload: string): [Buffer, Buffer, Buffer] {
    const parts = String(payload).split('.');
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
        throw new Error('Invalid encrypted delegation payload.');
    }
    return [
        Buffer.from(parts[0], 'base64'),
        Buffer.from(parts[1], 'base64'),
        Buffer.from(parts[2], 'base64')
    ];
}

export function createDelegationCipher(key: string): DelegationCipher {
    const derived = createHash('sha256').update(String(key), 'utf8').digest();
    if (derived.length !== KEY_LENGTH) {
        throw new Error('Invalid delegation key derivation.');
    }
    return {
        encrypt(value: string): string {
            const iv = randomBytes(IV_LENGTH);
            const cipher = createCipheriv(ALGO, derived, iv);
            const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
            const tag = cipher.getAuthTag();
            return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join('.');
        },
        decrypt(payload: string): string {
            const [iv, tag, data] = splitPayload(payload);
            const decipher = createDecipheriv(ALGO, derived, iv);
            decipher.setAuthTag(tag);
            return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
        }
    };
}

export function resolveDelegationCipherKey(encryption?: { key?: string; keyEnv?: string }): string | undefined {
    if (!encryption) {
        return undefined;
    }
    if (encryption.key && encryption.key.trim()) {
        return encryption.key;
    }
    if (encryption.keyEnv && process.env[encryption.keyEnv]) {
        return process.env[encryption.keyEnv];
    }
    return undefined;
}
