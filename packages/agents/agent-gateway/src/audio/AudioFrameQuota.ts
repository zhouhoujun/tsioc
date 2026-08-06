import { Inject, Injectable } from '@tsdi/ioc';
import { GATEWAY_CONFIG } from '../tokens';
import { AudioFrameQuotaOptions, GatewayConfig, defaultGatewayConfig } from '../contracts/GatewayConfig';

export type { AudioFrameQuotaOptions } from '../contracts/GatewayConfig';

export type AudioQuotaViolation = 'frame-size' | 'session-bytes' | 'frame-rate';

export interface AudioQuotaDecision {
    allowed: boolean;
    reason?: AudioQuotaViolation;
    /**
     * Remaining allowed session bytes after this decision.
     */
    remainingBytes?: number;
}

interface SessionEntry {
    bytes: number;
    frameTimes: number[];
}

const DEFAULT_QUOTA: Required<AudioFrameQuotaOptions> = {
    maxFrameBytes: 1024 * 1024,
    maxSessionBytes: 10 * 1024 * 1024,
    maxFramesPerWindow: 12_000,
    windowMs: 60_000
};

/**
 * Per-principal audio frame quota controller.
 *
 * Enforces three limits per key (principal or session id): a single-frame
 * byte cap, a per-session cumulative byte cap, and a sliding-window frame
 * rate cap. Mirrors {@link RateLimiter}'s windowing style but is keyed by
 * audio session identity so a flooded WebSocket cannot exhaust gateway
 * memory through the audio channel.
 */
@Injectable()
export class AudioFrameQuota {
    private readonly sessions = new Map<string, SessionEntry>();

    constructor(
        @Inject(GATEWAY_CONFIG, { nullable: true }) private config: GatewayConfig = defaultGatewayConfig
    ) {
        setInterval(() => this.evictExpired(), this.windowMs).unref();
    }

    /**
     * Check one audio frame against the quota for the given key.
     * A rejected frame consumes nothing.
     */
    check(key: string, chunk: Uint8Array): AudioQuotaDecision {
        const options = this.effectiveOptions();
        if (chunk.byteLength > options.maxFrameBytes) {
            return { allowed: false, reason: 'frame-size', remainingBytes: this.remainingSessionBytes(key, options) };
        }

        let entry = this.sessions.get(key);
        if (!entry) {
            entry = { bytes: 0, frameTimes: [] };
            this.sessions.set(key, entry);
        }
        const now = Date.now();
        const cutoff = now - options.windowMs;
        entry.frameTimes = entry.frameTimes.filter(time => time > cutoff);
        if (entry.frameTimes.length >= options.maxFramesPerWindow) {
            return { allowed: false, reason: 'frame-rate', remainingBytes: this.remainingSessionBytes(key, options) };
        }
        if (entry.bytes + chunk.byteLength > options.maxSessionBytes) {
            return { allowed: false, reason: 'session-bytes', remainingBytes: this.remainingSessionBytes(key, options) };
        }
        entry.bytes += chunk.byteLength;
        entry.frameTimes.push(now);
        return { allowed: true, remainingBytes: this.remainingSessionBytes(key, options) };
    }

    /**
     * Current accumulated session bytes for the given key.
     */
    sessionUsage(key: string): number {
        return this.sessions.get(key)?.bytes ?? 0;
    }

    /**
     * Reset session accounting for the given key (session end/cancel/close).
     */
    resetSession(key: string): void {
        this.sessions.delete(key);
    }

    private remainingSessionBytes(key: string, options: Required<AudioFrameQuotaOptions>): number {
        return Math.max(0, options.maxSessionBytes - this.sessionUsage(key));
    }

    private get windowMs(): number {
        return this.config.audioQuota?.windowMs ?? DEFAULT_QUOTA.windowMs;
    }

    private effectiveOptions(): Required<AudioFrameQuotaOptions> {
        const quota = this.config.audioQuota;
        return {
            maxFrameBytes: quota?.maxFrameBytes ?? DEFAULT_QUOTA.maxFrameBytes,
            maxSessionBytes: quota?.maxSessionBytes ?? DEFAULT_QUOTA.maxSessionBytes,
            maxFramesPerWindow: quota?.maxFramesPerWindow ?? DEFAULT_QUOTA.maxFramesPerWindow,
            windowMs: quota?.windowMs ?? DEFAULT_QUOTA.windowMs
        };
    }

    private evictExpired(): void {
        const options = this.effectiveOptions();
        const now = Date.now();
        const cutoff = now - options.windowMs;
        for (const [key, entry] of this.sessions) {
            entry.frameTimes = entry.frameTimes.filter(time => time > cutoff);
            if (entry.frameTimes.length === 0 && entry.bytes === 0) {
                this.sessions.delete(key);
            }
        }
    }
}
