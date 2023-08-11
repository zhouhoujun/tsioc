import { Handle, Inject, Injectable, Module, chain, isString, runChain } from '@tsdi/ioc';
import { isBuffer } from '../utils';
import { SendPacket } from '../TransportSession';
import { CodingContext, ENCODINGS, Encoder, Encoding, NEXT_VOID } from '../coding';

@Injectable()
export class JsonEncoding implements Encoding {

    handle(ctx: CodingContext<SendPacket, Buffer>, next: () => void): void {
        if (ctx.chunk && isBuffer(ctx.chunk)) {
            ctx.output = ctx.chunk;
        } else {
            ctx.output = Buffer.from(JSON.stringify(ctx.input));
        }
    }
}

@Injectable()
export class JsonEncoder extends Encoder {

    private china?: Handle<CodingContext<SendPacket, Buffer>, void>;
    constructor(@Inject(ENCODINGS) private encodings: Encoding[]) {
        super()
    }

    encode(input: SendPacket): Buffer {
        return this.write(input);
    }

    write(input: SendPacket, maxSize?: number, chunk?: Buffer, callback?: (err?: any) => void): Buffer {
        const ctx = { input, maxSize, chunk, callback } as CodingContext<SendPacket, Buffer>;
        if (!this.china) {
            this.china = chain(this.encodings.map(c => c.handle.bind(c)));
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
        { provide: ENCODINGS, useClass: JsonEncoding, multi: true },
        { provide: Encoder, useClass: JsonEncoder }
    ]
})
export class JsonEncodingModule {

}
