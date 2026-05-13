import * as crypto from 'crypto';
import { Injectable } from '@tsdi/ioc';
import { PairingCode } from '../contracts/PairingCode';

/**
 * One-time pairing code store.
 * Mirrors zeroclaw-gateway's pairing code auth mechanism.
 */
@Injectable()
export class PairingStore {
    private codes = new Map<string, PairingCode>();
    private readonly codeTtlMs = 5 * 60 * 1000; // 5 minutes

    /** Generate a new pairing code */
    generate(): PairingCode {
        this.evictExpired();

        const code = crypto.randomBytes(4).toString('hex');
        const now = Date.now();
        const entry: PairingCode = {
            code,
            createdAt: now,
            expiresAt: now + this.codeTtlMs,
            used: false
        };
        this.codes.set(code, entry);
        return entry;
    }

    /** Validate a pairing code (marks it used on success) */
    validate(code: string): boolean {
        this.evictExpired();
        const entry = this.codes.get(code);
        if (!entry || entry.used || entry.expiresAt < Date.now()) {
            return false;
        }
        entry.used = true;
        this.codes.delete(code);
        return true;
    }

    /** List active (unused, non-expired) codes */
    listActive(): PairingCode[] {
        this.evictExpired();
        return Array.from(this.codes.values()).filter(c => !c.used);
    }

    private evictExpired(): void {
        const now = Date.now();
        for (const [code, entry] of this.codes) {
            if (entry.expiresAt < now || entry.used) {
                this.codes.delete(code);
            }
        }
    }
}
