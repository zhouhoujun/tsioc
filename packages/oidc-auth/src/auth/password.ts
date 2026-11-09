import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const SCRYPT_PREFIX = 'scrypt';
const DEFAULT_KEY_LENGTH = 64;
const DEFAULT_SALT_LENGTH = 16;

function derive(password: string, salt: string, keyLength: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        scrypt(password, salt, keyLength, (err, derivedKey) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(derivedKey);
        });
    });
}

/**
 * Hash a plain text password with scrypt.
 *
 * The output format is `scrypt$<salt>$<derived-key-hex>`, which keeps the
 * salt and parameters self-describing for future upgrades.
 */
export async function hashPassword(password: string, keyLength = DEFAULT_KEY_LENGTH): Promise<string> {
    if (typeof password !== 'string' || password.length === 0) {
        throw new Error('Password is required');
    }
    const salt = randomBytes(DEFAULT_SALT_LENGTH).toString('hex');
    const derived = await derive(password, salt, keyLength);
    return `${SCRYPT_PREFIX}$${salt}$${derived.toString('hex')}`;
}

/**
 * Verify a plain text password against a stored scrypt hash.
 */
export async function verifyPassword(password: string, stored?: string | null): Promise<boolean> {
    if (typeof password !== 'string' || !stored) {
        return false;
    }
    const [prefix, salt, hash] = stored.split('$');
    if (prefix !== SCRYPT_PREFIX || !salt || !hash) {
        return false;
    }
    let expected: Buffer;
    try {
        expected = Buffer.from(hash, 'hex');
    } catch {
        return false;
    }
    if (!expected.length) {
        return false;
    }
    try {
        const derived = await derive(password, salt, expected.length);
        return derived.length === expected.length && timingSafeEqual(derived, expected);
    } catch {
        return false;
    }
}
