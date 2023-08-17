import { Abstract, Handle, chain, tokenId } from '@tsdi/ioc';
import { Packet } from '@tsdi/common';
import { InjectLog, Logger } from '@tsdi/logger';
import { SendPacket } from './TransportSession';


export type EncodingBuffers = [Buffer, Buffer | null];

export interface Subpackage extends SendPacket {
    caches: Buffer[];
    cacheSize: number;
    headCached?: boolean;
    residueSize: number;
    push?(chunk: Buffer, limit: number): EncodingBuffers | null
}


@Abstract()
export abstract class Encoder {
    abstract encode(input: Subpackage, chunk: Buffer | null, options?: CodingOption): EncodingBuffers | null;
}


function concatSub(subpkg: Subpackage, size: number): Buffer {
    let data: Buffer[];
    if (subpkg.headCached) {
        subpkg.headCached = false;
        data = [subpkg.caches[0], ...subpkg.caches.slice(1)];
    } else {
        data = subpkg.caches;
    }
    subpkg.caches = [];
    subpkg.cacheSize = 0;
    return Buffer.concat(data);
}


export function push(this: Subpackage, chunk: Buffer, limit: number): EncodingBuffers | null {
    const bufSize = Buffer.byteLength(chunk);
    const total = this.cacheSize + bufSize;

    if (total == limit) {
        this.caches.push(chunk);
        const data = concatSub(this, limit);
        return [data, null];
    } else if (total > limit) {
        const idx = bufSize - (total - limit);
        const message = chunk.subarray(0, idx);
        const rest = chunk.subarray(idx);
        this.caches.push(message);
        const data = concatSub(this, limit);
        this.residueSize -= (bufSize - Buffer.byteLength(rest));
        return [data, rest];
    } else {
        this.caches.push(chunk);
        this.cacheSize += bufSize;
        this.residueSize -= bufSize;
        if (this.residueSize <= 0) {
            const data = concatSub(this, this.cacheSize);
            return [data, null];
        }

    }
    return null;
}


@Abstract()
export abstract class AbstractEncoder extends Encoder {

    @InjectLog() private logger!: Logger;

    private china?: Handle<EncodingContext, void>;

    protected abstract get encodings(): Encoding[];

    encode(input: Subpackage, chunk: Buffer | null, options?: CodingOption): EncodingBuffers | null {
        const ctx = { ...options, input: input, chunk, logger: this.logger } as EncodingContext;
        return this.handle(ctx);
    }

    protected handle(ctx: EncodingContext): EncodingBuffers | null {
        try {
            if (!this.china) {
                this.china = chain(this.encodings.map(c => c.handle.bind(c)));
            }
            this.china(ctx, NEXT_VOID);
        } catch (err) {
            this.logger.error(err);
            throw err;
        }

        return ctx.output ?? null;
    }

}


@Abstract()
export abstract class Decoder {
    abstract decode(chunk: Buffer, options?: CodingOption): Packet | null;
}

@Abstract()
export abstract class AbstractDecoder extends Decoder {

    @InjectLog() private logger!: Logger;

    private china?: Handle<DecodingContext, void>;

    protected abstract get decodings(): Decoding[];

    decode(chunk: Buffer, options?: CodingOption): Packet | null {
        const ctx = { ...options, chunk, logger: this.logger } as DecodingContext;
        return this.handle(ctx);
    }

    protected handle(ctx: DecodingContext): Packet | null {
        if (!this.china) {
            this.china = chain(this.decodings.map(c => c.handle.bind(c)));
        }
        try {
            this.china(ctx, NEXT_VOID);
        } catch (err) {
            this.logger.error(err);
            throw err;
        }
        return ctx.output ?? null;
    }

}

export interface CodingOption {
    /**
     * packet delimiter flag
     */
    delimiter?: string;
    /**
     * packet max size limit.
     */
    limit?: number;
    /**
     * payload max size limit
     */
    maxSize?: number;
    topic?: string;
    channel?: string;
}


export interface EncodingContext extends CodingOption {
    input: Subpackage;
    output?: EncodingBuffers;
    packSize?: number;
    chunk?: Buffer;
    logger?: Logger;
}

export interface DecodingContext extends CodingOption  {
    cache: BufferCache;
    input?: Buffer;
    output?: Packet;
    packSize?: number;
    chunk?: Buffer;
    logger?: Logger;
}

export interface BufferCache {
    buffers: Buffer[];
    length: number;
    contentLength: number | null;
    pkgs: Map<number | string, Packet>;
}

export const NEXT_VOID = () => { };

export interface Encoding {
    handle(ctx: EncodingContext, next: () => void): void;
}

export interface Decoding {
    handle(ctx: DecodingContext, next: () => void): void;
}

export const ENCODINGS = tokenId<Encoding[]>('ENCODINGS');

export const DECODINGS = tokenId<Decoding[]>('DECODINGS');
