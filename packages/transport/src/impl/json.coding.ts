import { Inject, Injectable, Module, tokenId } from '@tsdi/ioc';
import { InvalidJsonException, Packet } from '@tsdi/common';
import { isBuffer } from '../utils';
import { CodingContext, Decoding, AbstractDecoder, Encoding, AbstractEncoder, CodingOption } from '../coding';
import { SendPacket } from '../TransportSession';


@Injectable()
export class JsonEncoding implements Encoding {

    handle(ctx: CodingContext<SendPacket, Buffer>, next: () => void): void {
        if (ctx.chunk && !ctx.input.payload) {
            ctx.input.payload = isBuffer(ctx.chunk) ? new TextDecoder().decode(ctx.chunk) : ctx.chunk;
        }
        ctx.output = Buffer.from(JSON.stringify(ctx.input));

    }
}

export const JSON_ENCODINGS = tokenId<Encoding[]>('JSON_ENCODINGS');

@Injectable()
export class JsonEncoder extends AbstractEncoder {

    constructor(@Inject(JSON_ENCODINGS) readonly encodings: Encoding[]) {
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

    handle(ctx: CodingContext<Buffer | string, Packet>, next: () => void): void {
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

    constructor(@Inject(JSON_DECODINGS) readonly decodings: Decoding[]) {
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
