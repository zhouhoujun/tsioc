import type { ConsumerIdempotencyStore } from '@tsdi/service';
import type Redis from 'ioredis';

export interface RedisIdempotencyStoreOptions {
    /** key namespace. Default `tsdi:consumer:`. */
    prefix?: string;
}

/**
 * Shared consumer dedupe backed by Redis `SET NX PX`.
 *
 * Used automatically for Redis Stream consumers when idempotency is enabled,
 * so duplicate reclaimed entries are deduplicated across replicas.
 */
export class RedisIdempotencyStore implements ConsumerIdempotencyStore {
    private readonly prefix: string;

    constructor(
        private readonly client: Pick<Redis, 'set' | 'del'>,
        options: RedisIdempotencyStoreOptions = {}
    ) {
        this.prefix = options.prefix ?? 'tsdi:consumer:';
    }

    async reserve(key: string, ttlMs: number): Promise<boolean> {
        const result = await (this.client as any).set(
            `${this.prefix}${key}`,
            '1',
            'PX',
            Math.max(1, Math.floor(ttlMs)),
            'NX'
        );
        return result === 'OK';
    }

    async release(key: string): Promise<void> {
        await this.client.del(`${this.prefix}${key}`);
    }
}
