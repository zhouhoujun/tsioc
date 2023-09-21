import { Backend, Handler, Interceptor } from '@tsdi/core';
import { Abstract, DefaultInvocationContext, Injector, InvokeArguments, tokenId } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Packet } from './packet';


/**
 * coding context.
 */
export class Context extends DefaultInvocationContext {
    constructor(
        injector: Injector,
        public packet?: Packet,
        public raw?: Buffer,
        options?: InvokeArguments) {
        super(injector, options)
    }
}


@Abstract()
export abstract class Encoder implements Handler<Context, Buffer> {
    abstract handle(ctx: Context): Observable<Buffer>;
}

@Abstract()
export abstract class EncoderBackend implements Backend<Context, Buffer> {
    abstract handle(ctx: Context): Observable<Buffer>;
}



export const ENCODINGS = tokenId<Interceptor<Context, Buffer>[]>('ENCODINGS');


@Abstract()
export abstract class Decoder implements Handler<Context, Packet> {
    abstract handle(ctx: Context): Observable<Packet>;
}

@Abstract()
export abstract class DecoderBackend implements Backend<Context, Packet> {
    abstract handle(ctx: Context): Observable<Packet>;
}

export const DECODINGS = tokenId<Interceptor<Context, Packet>[]>('DECODINGS');



