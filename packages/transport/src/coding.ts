import { Abstract, Handle, chain, tokenId } from '@tsdi/ioc';
import { Packet } from '@tsdi/common';
import { InjectLog, Logger } from '@tsdi/logger';
import { Observable, of, throwError } from 'rxjs';
import { SendPacket } from './TransportSession';


@Abstract()
export abstract class Encoder {
    abstract encode(input: SendPacket, chunk: Buffer|null, maxSize?: number): Observable<null | Buffer>;
}


@Abstract()
export abstract class AbstractEncoder extends Encoder {

    @InjectLog() private logger!: Logger;

    private china?: Handle<CodingContext<SendPacket, Buffer>, void>;

    protected abstract get encodings(): Encoding[];

    encode(input: SendPacket, chunk: Buffer|null, maxSize?: number): Observable<null | Buffer> {
        const ctx = { input, maxSize, chunk, logger: this.logger } as CodingContext<SendPacket, Buffer>;
        try { 
            if (!this.china) {
                this.china = chain(this.encodings.map(c => c.handle.bind(c)));
            }
            this.china(ctx, NEXT_VOID);
        } catch (err) {
            this.logger.error(err);
            return throwError(() => err);
        }
        if (ctx.output) {
            return of(ctx.output);
        }
        return of(null);
    }

}


@Abstract()
export abstract class Decoder {
    abstract decode(...args: any[]): Observable<null | Packet>;
}

@Abstract()
export abstract class AbstractDecoder extends Decoder {

    @InjectLog() private logger!: Logger;

    private china?: Handle<CodingContext<Buffer | string, Packet>, void>;

    protected abstract get decodings(): Decoding[];

    protected runDecode(ctx: CodingContext<Buffer | string, Packet>): Packet {
        if (!this.china) {
            this.china = chain(this.decodings.map(c => c.handle.bind(c)));
        }
        try {
            this.china(ctx, NEXT_VOID);
        } catch (err) {
            this.logger.error(err);
            throw err;
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
    complete(packet?: TOutput): void;
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
