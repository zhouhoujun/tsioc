import { Abstract, Injectable, OnDestroy } from '@tsdi/ioc';

export interface GatewayCircuitRecord {
    failures: number;
    openedAt?: number;
    halfOpen?: boolean;
    halfOpenInFlight?: boolean;
}

export interface GatewayCacheRecord {
    value: any;
    storedAt: number;
    size: number;
}

export interface GatewayStateStoreStats {
    cacheEntries: number;
    circuits: Array<{ key: string; failures: number; open: boolean }>;
}

/**
 * Shared state for gateway policies.
 *
 * Default implementations are process-local; provide `RedisGatewayStateStore`
 * when the gateway runs as multiple replicas and rate-limit/circuit/cache/nonce
 * state must be shared.
 */
@Abstract()
export abstract class GatewayStateStore {
    abstract getCache(key: string): Promise<GatewayCacheRecord | undefined>;
    abstract setCache(key: string, record: GatewayCacheRecord, ttlMs: number): Promise<void>;
    abstract clearCache(): Promise<void>;
    abstract getCircuit(key: string): Promise<GatewayCircuitRecord | undefined>;
    abstract setCircuit(key: string, record: GatewayCircuitRecord, ttlMs: number): Promise<void>;
    abstract deleteCircuit(key: string): Promise<void>;
    abstract useNonce(key: string, ttlMs: number): Promise<boolean>;
    abstract stats(): Promise<GatewayStateStoreStats>;
    abstract close(): Promise<void>;
}

interface Timed<T> {
    value: T;
    expireAt: number;
}

/**
 * Process-local state store. Useful for tests and explicit wiring; the runtime
 * uses its own maps when no store is provided.
 */
@Injectable()
export class InMemoryGatewayStateStore extends GatewayStateStore implements OnDestroy {
    private cache = new Map<string, Timed<GatewayCacheRecord>>();
    private circuits = new Map<string, Timed<GatewayCircuitRecord>>();
    private nonces = new Map<string, number>();

    async getCache(key: string): Promise<GatewayCacheRecord | undefined> {
        const entry = this.cache.get(key);
        if (!entry) return undefined;
        if (entry.expireAt <= Date.now()) {
            this.cache.delete(key);
            return undefined;
        }
        return entry.value;
    }

    async setCache(key: string, record: GatewayCacheRecord, ttlMs: number): Promise<void> {
        this.cache.set(key, { value: record, expireAt: Date.now() + ttlMs });
    }

    async clearCache(): Promise<void> {
        this.cache.clear();
    }

    async getCircuit(key: string): Promise<GatewayCircuitRecord | undefined> {
        const entry = this.circuits.get(key);
        if (!entry) return undefined;
        if (entry.expireAt <= Date.now()) {
            this.circuits.delete(key);
            return undefined;
        }
        return entry.value;
    }

    async setCircuit(key: string, record: GatewayCircuitRecord, ttlMs: number): Promise<void> {
        this.circuits.set(key, { value: record, expireAt: Date.now() + ttlMs });
    }

    async deleteCircuit(key: string): Promise<void> {
        this.circuits.delete(key);
    }

    async useNonce(key: string, ttlMs: number): Promise<boolean> {
        const now = Date.now();
        const expireAt = this.nonces.get(key);
        if (expireAt && expireAt > now) {
            return false;
        }
        this.nonces.set(key, now + ttlMs);
        return true;
    }

    async stats(): Promise<GatewayStateStoreStats> {
        const now = Date.now();
        return {
            cacheEntries: Array.from(this.cache.values()).filter(entry => entry.expireAt > now).length,
            circuits: Array.from(this.circuits.entries())
                .filter(([, entry]) => entry.expireAt > now)
                .map(([key, entry]) => ({
                    key,
                    failures: entry.value.failures,
                    open: !!entry.value.openedAt
                }))
        };
    }

    async close(): Promise<void> {
        this.cache.clear();
        this.circuits.clear();
        this.nonces.clear();
    }

    onDestroy(): void {
        void this.close();
    }
}

/** Minimal ioredis surface used by the Redis store. */
export interface RedisLike {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ...args: any[]): Promise<any>;
    del(...keys: string[]): Promise<number>;
    scan(cursor: string, ...args: any[]): Promise<[string, string[]]>;
}

export interface RedisGatewayStateStoreOptions {
    /** existing ioredis client (preferred when the app already owns one). */
    client?: RedisLike;
    /** connection url, used when `client` is omitted. */
    url?: string;
    /** key prefix. Default `tsdi:gateway:`. */
    prefix?: string;
    /** close the client on store shutdown (set by the URL helper). */
    ownsClient?: boolean;
}

const DEFAULT_PREFIX = 'tsdi:gateway:';

/**
 * Redis-backed gateway state for multi-replica deployments.
 *
 * Cache entries and circuit state are JSON values with PX TTL; nonces use
 * `SET NX PX` so replay protection is atomic across replicas.
 */
export class RedisGatewayStateStore extends GatewayStateStore implements OnDestroy {
    private readonly prefix: string;

    constructor(private readonly options: RedisGatewayStateStoreOptions) {
        super();
        this.prefix = options.prefix ?? DEFAULT_PREFIX;
    }

    async getCache(key: string): Promise<GatewayCacheRecord | undefined> {
        const raw = await this.client.get(this.key('cache', key));
        return raw ? JSON.parse(raw) : undefined;
    }

    async setCache(key: string, record: GatewayCacheRecord, ttlMs: number): Promise<void> {
        await this.client.set(this.key('cache', key), JSON.stringify(record), 'PX', Math.max(1, ttlMs));
    }

    async clearCache(): Promise<void> {
        await this.deleteByPrefix(this.key('cache', ''));
    }

    async getCircuit(key: string): Promise<GatewayCircuitRecord | undefined> {
        const raw = await this.client.get(this.key('circuit', key));
        return raw ? JSON.parse(raw) : undefined;
    }

    async setCircuit(key: string, record: GatewayCircuitRecord, ttlMs: number): Promise<void> {
        await this.client.set(this.key('circuit', key), JSON.stringify(record), 'PX', Math.max(1, ttlMs));
    }

    async deleteCircuit(key: string): Promise<void> {
        await this.client.del(this.key('circuit', key));
    }

    async useNonce(key: string, ttlMs: number): Promise<boolean> {
        const result = await this.client.set(
            this.key('nonce', key),
            '1',
            'PX', Math.max(1, ttlMs),
            'NX'
        );
        return result === 'OK';
    }

    async stats(): Promise<GatewayStateStoreStats> {
        const cacheEntries = (await this.scanKeys(this.key('cache', ''))).length;
        const circuitKeys = await this.scanKeys(this.key('circuit', ''));
        const circuits: GatewayStateStoreStats['circuits'] = [];
        for (const key of circuitKeys) {
            const raw = await this.client.get(key);
            if (raw) {
                const record = JSON.parse(raw) as GatewayCircuitRecord;
                circuits.push({
                    key: key.slice(this.prefix.length + 'circuit:'.length),
                    failures: record.failures,
                    open: !!record.openedAt
                });
            }
        }
        return { cacheEntries, circuits };
    }

    async close(): Promise<void> {
        if (this.options.ownsClient && this.options.client) {
            const client = this.options.client as unknown as { quit?: () => Promise<any>; disconnect?: () => void };
            try {
                await client.quit?.();
            } catch {
                client.disconnect?.();
            }
        }
    }

    onDestroy(): void {
        void this.close();
    }

    private get client(): RedisLike {
        if (!this.options.client) {
            throw new Error('RedisGatewayStateStore requires an ioredis client (`createRedisGatewayStateStore`)');
        }
        return this.options.client;
    }

    private key(kind: string, key: string): string {
        return `${this.prefix}${kind}:${key}`;
    }

    private async scanKeys(pattern: string): Promise<string[]> {
        const keys: string[] = [];
        let cursor = '0';
        do {
            const [next, batch] = await this.client.scan(cursor, 'MATCH', `${pattern}*`, 'COUNT', 200);
            cursor = next;
            keys.push(...batch);
        } while (cursor !== '0');
        return keys;
    }

    private async deleteByPrefix(pattern: string): Promise<void> {
        const keys = await this.scanKeys(pattern);
        if (keys.length) {
            await this.client.del(...keys);
        }
    }
}

/**
 * Create a Redis-backed store from a URL. `ioredis` is imported lazily so
 * gateway users who stay in-memory do not pay for the dependency.
 */
export async function createRedisGatewayStateStore(
    url: string,
    options: Omit<RedisGatewayStateStoreOptions, 'client' | 'url'> = {}
): Promise<GatewayStateStore> {
    const mod = await import('ioredis');
    const Redis = (mod as any).default ?? mod;
    const client = new Redis(url);
    return new RedisGatewayStateStore({ ...options, client, ownsClient: true });
}
