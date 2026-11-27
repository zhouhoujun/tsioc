import type { SagaJournal, SagaJournalEntry } from '@tsdi/service';
import type Redis from 'ioredis';

export interface RedisSagaJournalOptions {
    /** key namespace. Default `tsdi:saga:`. */
    prefix?: string;
    /** journal TTL in milliseconds. Default 24 hours. */
    ttlMs?: number;
}

/**
 * Durable saga journal backed by Redis.
 *
 * Step business effects and this journal should still share the same
 * transaction/outbox where exact recovery matters; the TTL bounds abandoned
 * journal entries.
 */
export class RedisSagaJournal implements SagaJournal {
    private readonly prefix: string;
    private readonly ttlMs: number;

    constructor(
        private readonly client: Pick<Redis, 'get' | 'set' | 'del'>,
        options: RedisSagaJournalOptions = {}
    ) {
        this.prefix = options.prefix ?? 'tsdi:saga:';
        this.ttlMs = Math.max(0, options.ttlMs ?? 24 * 60 * 60_000);
    }

    async load(id: string): Promise<SagaJournalEntry | undefined> {
        const raw = await this.client.get(`${this.prefix}${id}`);
        if (!raw) {
            return undefined;
        }
        try {
            const parsed = JSON.parse(String(raw)) as SagaJournalEntry;
            if (!parsed || !Array.isArray(parsed.completed)) {
                return undefined;
            }
            return parsed;
        } catch {
            return undefined;
        }
    }

    async save(id: string, entry: SagaJournalEntry): Promise<void> {
        const key = `${this.prefix}${id}`;
        const value = JSON.stringify(entry);
        if (this.ttlMs > 0) {
            await (this.client as any).set(key, value, 'PX', Math.floor(this.ttlMs));
        } else {
            await this.client.set(key, value);
        }
    }

    async clear(id: string): Promise<void> {
        await this.client.del(`${this.prefix}${id}`);
    }
}
