import { Abstract, Handle, chain, tokenId } from '@tsdi/ioc';
import { Packet } from '@tsdi/common';
import { InjectLog, Logger } from '@tsdi/logger';
import { SendPacket } from './TransportSession';
import { Observable } from 'rxjs';


@Abstract()
export abstract class Encoder {
    abstract write(input: SendPacket, maxSize?: number, chunk?: Buffer, callback?: (err?: any) => void): void;
    abstract get packet(): Observable<Buffer>;
}


@Abstract()
export abstract class AbstractEncoder extends Encoder {

    @InjectLog() private logger!: Logger;

    private china?: Handle<CodingContext<SendPacket, Buffer>, void>;

    protected abstract get encodings(): Encoding[];

    write(input: SendPacket, maxSize?: number, chunk?: Buffer, callback?: (err?: any) => void): void {
        const ctx = { input, maxSize, chunk, callback, logger: this.logger } as CodingContext<SendPacket, Buffer>;
        this.encode(ctx, callback);
    }

    protected encode(ctx: CodingContext<SendPacket, Buffer>, callback?: (err?: any) => void) {
        if (!this.china) {
            this.china = chain(this.encodings.map(c => c.handle.bind(c)));
        }
        try {
            this.china(ctx, callback ?? NEXT_VOID);
        } catch (err) {
            this.logger.error(err);
            callback?.(err)
        }
    }

}


@Abstract()
export abstract class Decoder {
    abstract onData(...args: any[]): void;
    abstract get packet(): Observable<Packet>;
}

@Abstract()
export abstract class AbstractDecoder extends Decoder {

    @InjectLog() private logger!: Logger;

    private china?: Handle<CodingContext<Buffer | string, Packet>, void>;

    protected abstract get decodings(): Decoding[];

    protected decode(ctx: CodingContext<Buffer | string, Packet>, callback?: (err?: any) => void): Packet {
        if (!this.china) {
            this.china = chain(this.decodings.map(c => c.handle.bind(c)));
        }
        try {
            this.china(ctx, callback ?? NEXT_VOID);
        } catch (err) {
            this.logger.error(err);
            callback?.(err)
        }
        return ctx.output!;
    }

}


export interface CodingContext<TInput, TOutput> {
    [x: string]: any;
    input: TInput;
    output?: TOutput;
    maxSize?: number;
    chunk?: Buffer;
    logger?: Logger;
}

export const NEXT_VOID = () => { };

export interface Encoding<TInput = SendPacket, TOutput = Buffer> {
    handle(ctx: CodingContext<TInput, TOutput>, next: () => void): void;
}


export interface Decoding<TInput = Buffer | string, TOutput = Packet> {
    handle(ctx: CodingContext<TInput, TOutput>, next: () => void): void;
}

export const ENCODINGS = tokenId<Encoding[]>('ENCODINGS');

export const DECODINGS = tokenId<Decoding[]>('DECODINGS');
