import { Handle, Inject, Injectable, Module, chain, isString, runChain } from '@tsdi/ioc';
import { isBuffer } from '../utils';
import { SendPacket } from '../TransportSession';
import { CodingContext, ENCODINGS, Encoder, Encoding, NEXT_VOID } from '../coding';
import { InjectLog, Logger } from '@tsdi/logger';

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

    @InjectLog() private logger!: Logger;

    private china?: Handle<CodingContext<SendPacket, Buffer>, void>;
    constructor(@Inject(ENCODINGS) private encodings: Encoding[]) {
        super()
    }

    encode(input: SendPacket): Buffer {
        const ctx = { input, logger: this.logger } as CodingContext<SendPacket, Buffer>;
        this.handle(ctx);
        return ctx.output!;
    }

    write(input: SendPacket, maxSize?: number, chunk?: Buffer, callback?: (err?: any) => void): void {
        const ctx = { input, maxSize, chunk, callback, logger: this.logger } as CodingContext<SendPacket, Buffer>;
        this.handle(ctx, callback);
    }

    protected handle(ctx: CodingContext<SendPacket, Buffer>, callback?: (err?: any) => void) {
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



@Module({
    providers: [
        { provide: ENCODINGS, useClass: JsonEncoding, multi: true },
        JsonEncoder
    ]
})
export class JsonEncodingModule {

}
