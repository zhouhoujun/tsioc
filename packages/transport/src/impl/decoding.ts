import { Handle, Inject, Injectable, Module, chain } from '@tsdi/ioc';
import { InvalidJsonException, Packet } from '@tsdi/common';
import { isBuffer } from '../utils';
import { CodingContext, DECODINGS, Decoding, Decoder, NEXT_VOID } from '../coding';


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



@Injectable()
export class JsonDecoder extends Decoder {

    private china?: Handle<CodingContext<Buffer | string, Packet>, void>;
    constructor(@Inject(DECODINGS) private decodings: Decoding[]) {
        super()
    }

    decode(input: Buffer | string, maxSize?: number, chunk?: Buffer, callback?: (err?: any) => void): Packet {
        const ctx = { input, maxSize, chunk, callback } as CodingContext<Buffer | string, Packet>;
        if (!this.china) {
            this.china = chain(this.decodings.map(c => c.handle.bind(c)));
        }
        try {
            this.china(ctx, callback ?? NEXT_VOID);
        } catch (err) {
            callback?.(err)
        }
        return ctx.output!;
    }

}


@Module({
    providers: [
        { provide: DECODINGS, useClass: JsonDecoding, multi: true },
        { provide: Decoder, useClass: JsonDecoder }
    ]
})
export class JsonDecodingModule {

}
