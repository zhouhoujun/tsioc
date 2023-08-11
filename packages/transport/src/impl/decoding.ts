import { Handle, Inject, Injectable, Module, chain } from '@tsdi/ioc';
import { InvalidJsonException, Packet } from '@tsdi/common';
import { InjectLog, Logger } from '@tsdi/logger';
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

    @InjectLog() private logger!: Logger;

    private china?: Handle<CodingContext<Buffer | string, Packet>, void>;
    constructor(@Inject(DECODINGS) private decodings: Decoding[]) {
        super()
    }

    decode(input: Buffer | string, maxSize?: number, chunk?: Buffer, callback?: (err?: any) => void): Packet {
        const ctx = { input, maxSize, chunk, callback, logger: this.logger } as CodingContext<Buffer | string, Packet>;
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


@Module({
    providers: [
        { provide: DECODINGS, useClass: JsonDecoding, multi: true },
        JsonDecoder
    ]
})
export class JsonDecodingModule {

}
