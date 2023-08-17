import { ArgumentExecption, Inject, Injectable, Module, tokenId } from '@tsdi/ioc';
import { InvalidJsonException, PacketLengthException } from '@tsdi/common';
import { isBuffer } from '../utils';
import { Decoding, AbstractDecoder, Encoding, AbstractEncoder, EncodingContext, DecodingContext } from '../coding';
import { ctype, hdr } from '../consts';


@Injectable()
export class JsonEncoding implements Encoding {

    handle(ctx: EncodingContext, next: () => void): void {
        if (ctx.output) return;
        if (ctx.chunk) {
            ctx.input.packet.payload = isBuffer(ctx.chunk) ? new TextDecoder().decode(ctx.chunk) : ctx.chunk;
            if ((ctx.input.packet.headers?.[hdr.CONTENT_TYPE] ?? '').indexOf(ctype.APPL_JSON) >= 0) {
                ctx.input.packet.payload = JSON.parse(ctx.input.packet.payload);
            }
        }
        const data = Buffer.from(JSON.stringify(ctx.input.packet));
        if (ctx.maxSize && Buffer.byteLength(data) > ctx.maxSize) {
            throw new PacketLengthException('packet size large than max size ' + ctx.maxSize);
        }
        ctx.output = [Buffer.from(JSON.stringify(ctx.input.packet)), null];

    }
}

export const JSON_ENCODINGS = tokenId<Encoding[]>('JSON_ENCODINGS');

@Injectable()
export class JsonEncoder extends AbstractEncoder {

    constructor(@Inject(JSON_ENCODINGS) protected readonly encodings: Encoding[]) {
        super()
    }

}



@Module({
    providers: [
        { provide: JSON_ENCODINGS, useClass: JsonEncoding, multi: true },
        JsonEncoder
    ]
})
export class JsonEncodingModule {

}



@Injectable()
export class JsonDecoding implements Decoding {

    handle(ctx: DecodingContext, next: () => void): void {
        if (ctx.output) return;
        if (!ctx.input) throw new ArgumentExecption('json decoding input empty');
        const jsonStr = isBuffer(ctx.input) ? new TextDecoder().decode(ctx.input) : ctx.input;
        try {
            return JSON.parse(jsonStr);
        } catch (err) {
            throw new InvalidJsonException(err, jsonStr);
        }
    }
}


export const JSON_DECODINGS = tokenId<Decoding>('JSON_DECODINGS');

@Injectable()
export class JsonDecoder extends AbstractDecoder {

    constructor(@Inject(JSON_DECODINGS) protected readonly decodings: Decoding[]) {
        super()
    }

}


@Module({
    providers: [
        { provide: JSON_DECODINGS, useClass: JsonDecoding, multi: true },
        JsonDecoder
    ]
})
export class JsonDecodingModule {

}

@Module({
    exports: [
        JsonEncodingModule,
        JsonDecodingModule
    ]
})
export class JsonCodingModule {

}
