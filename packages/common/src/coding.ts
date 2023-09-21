import { Backend, Handler } from '@tsdi/core';
import { Abstract, DefaultInvocationContext, Injector, InvokeArguments } from '@tsdi/ioc';
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


@Abstract()
export abstract class Decoder implements Handler<Context, Packet> {
    abstract handle(ctx: Context): Observable<Packet>;
}

@Abstract()
export abstract class DecoderBackend implements Backend<Context, Packet> {
    abstract handle(ctx: Context): Observable<Packet>;
}




