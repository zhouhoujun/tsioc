import { EMPTY_OBJ, Inject, Injectable, isNil, isString, tokenId } from '@tsdi/ioc';
import { Packet } from '@tsdi/common';
import { AbstractDecoder, AbstractEncoder, Decoding, DecodingContext, Encoding, EncodingContext } from '../coding';
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
        const chunk = ctx.chunk!;
        const bufSize = Buffer.byteLength(chunk);
        const maxSize = ctx.maxSize!;
        const total = ctx.input.cacheSize + bufSize;
        const packet = ctx.input;
        if (total == maxSize) {
            packet.caches.push(chunk);
            // ctx.output = ctx.getSendBuffer(packet, maxSize);
            packet.residueSize -= bufSize;
        } else if (total > maxSize) {
            const idx = bufSize - (total - maxSize);
            const message = chunk.subarray(0, idx);
            const rest = chunk.subarray(idx);
            packet.caches.push(message);
            // const data = ctx.getSendBuffer(packet, maxSize);
            packet.residueSize -= (bufSize - Buffer.byteLength(rest));
        } else {
            packet.caches.push(chunk);
            packet.cacheSize += bufSize;
            packet.residueSize -= bufSize;
            if (packet.residueSize <= 0) {
                // const data = ctx.getSendBuffer(packet, packet.cacheSize);
                // ctx.output = data;
            }
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
