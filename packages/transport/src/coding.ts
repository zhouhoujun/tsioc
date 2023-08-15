import { Abstract, Handle, chain, tokenId } from '@tsdi/ioc';
import { Packet } from '@tsdi/common';
import { InjectLog, Logger } from '@tsdi/logger';
import { SendPacket } from './TransportSession';


@Abstract()
export abstract class Encoder {
    abstract encode(input: SendPacket, chunk: Buffer | null, options?: CodingOption): Buffer | null;
}


@Abstract()
export abstract class AbstractEncoder extends Encoder {

    @InjectLog() private logger!: Logger;

    private china?: Handle<CodingContext<SendPacket, Buffer>, void>;

    protected abstract get encodings(): Encoding[];

    encode(input: SendPacket, chunk: Buffer | null, options?: CodingOption): Buffer | null {
        const ctx = { ...options, input, chunk, logger: this.logger } as CodingContext<SendPacket, Buffer>;
        return this.handle(ctx);
    }

    protected handle(ctx: CodingContext<SendPacket, Buffer>): Buffer | null {
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

    private china?: Handle<CodingContext<Buffer, Packet>, void>;

    protected abstract get decodings(): Decoding[];

    protected handle(ctx: CodingContext<Buffer, Packet>): Packet | null {
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
     * packet size limit.
     */
    maxSize?: number;
    topic?: string;
    channel?: string;
}


export interface CodingContext<TInput, TOutput> {
    [x: string]: any;
    input: TInput;
    output?: TOutput;
    maxSize?: number;
    chunk?: Buffer;
    logger?: Logger;
    topic?: string;
    channel?: string;
}

export const NEXT_VOID = () => { };

export interface Encoding<TInput extends Packet = SendPacket> {
    handle(ctx: CodingContext<TInput, Buffer>, next: () => void): void;
}

export interface Decoding<TOutput extends Packet = Packet> {
    handle(ctx: CodingContext<Buffer, TOutput>, next: () => void): void;
}

export const ENCODINGS = tokenId<Encoding[]>('ENCODINGS');

export const DECODINGS = tokenId<Decoding[]>('DECODINGS');
