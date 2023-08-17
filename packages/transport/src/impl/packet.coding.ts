import { EMPTY_OBJ, Inject, Injectable, isNil, isString, tokenId } from '@tsdi/ioc';
import { AbstractDecoder, AbstractEncoder, Decoding, DecodingContext, Encoding, EncodingContext, push } from '../coding';
import { hdr } from '../consts';


export const HEADER_ENCODINGS = tokenId<Encoding[]>('HEADER_ENCODINGS');
export const PAYLOAD_ENCODINGS = tokenId<Encoding[]>('PAYLOAD_ENCODINGS');


@Injectable()
export class InitSubpackageEncoding implements Encoding {
    handle(ctx: EncodingContext, next: () => void): void {
        if (isNil(ctx.input.payloadSize) && ctx.input.packet.headers) {
            const len = ctx.input.packet.headers[hdr.CONTENT_LENGTH];
            ctx.input.payloadSize = isString(len) ? ~~len : len ?? 0;
            ctx.input.caches = [];
            ctx.input.residueSize = ctx.input.payloadSize;
            ctx.input.cacheSize = 0;
            Object.defineProperty(ctx.input, 'push', {
                value: push
            })
        }
        return next();
    }
}

@Injectable()
export class JsonHeadersEncoding implements Encoding {
    handle(ctx: EncodingContext, next: () => void): void {
        if (!ctx.input.headCached) {
            const headerBuff = Buffer.from(JSON.stringify(ctx.input.packet.headers ?? EMPTY_OBJ));
            if (ctx.input.payloadSize) {
                ctx.input.caches.push(headerBuff);
                ctx.input.cacheSize += Buffer.byteLength(headerBuff);
                ctx.input.headCached = true;
            } else {
                ctx.output = [headerBuff, null];
                return;
            }
        }
        return next();
    }
}


@Injectable()
export class VaildPayloadEncoding implements Encoding {
    handle(ctx: EncodingContext, next: () => void): void {
        if (ctx.chunk) {
            return next();
        }
    }
}

@Injectable()
export class PayloadEncoding implements Encoding {
    handle(ctx: EncodingContext, next: () => void): void {
        const data = ctx.input.push?.(ctx.chunk!, ctx.limit!);
        if (data) {
            ctx.output = data;
        }
    }
}


export class PacketEncoder extends AbstractEncoder {

    protected readonly encodings: Encoding[];

    constructor(
        @Inject(HEADER_ENCODINGS) headerEncodings: Encoding[],
        @Inject(PAYLOAD_ENCODINGS) payloadEncodings: Encoding[]
    ) {
        super();

        this.encodings = [...headerEncodings, ...payloadEncodings];
    }

}



export const HEADER_DECODINGS = tokenId<Decoding[]>('HEADER_DECODINGS');
export const PAYLOAD_DECODINGS = tokenId<Decoding[]>('PAYLOAD_DECODINGS');



@Injectable()
export class JsonHeadersDecoding implements Decoding {
    handle(ctx: DecodingContext, next: () => void): void {

        return next();
    }
}

export class PacketDecoder extends AbstractDecoder {

    protected readonly decodings: Decoding[];

    constructor(
        @Inject(HEADER_ENCODINGS) headerEncodings: Decoding[],
        @Inject(PAYLOAD_ENCODINGS) payloadEncodings: Decoding[]
    ) {
        super();
        this.decodings = [...headerEncodings, ...payloadEncodings];
    }
}
