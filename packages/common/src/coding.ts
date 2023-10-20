import { Backend, Handler, Interceptor } from '@tsdi/core';
import { Abstract, DefaultInvocationContext, Injector, InvokeArguments } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Packet } from './packet';
import { Transport } from './protocols';
import { TransportOpts } from './TransportFactory';
import { isBuffer } from './utils';


/**
 * coding context.
 */
export class Context extends DefaultInvocationContext {

    readonly transport: Transport;
    readonly transportOpts: TransportOpts;
    public packet?: Packet;
    public raw?: Buffer;
    readonly headerDelimiter?: Buffer;

    constructor(
        injector: Injector,
        transport: Transport,
        transportOpts: TransportOpts,
        packet: Packet,
        headerDelimiter?: Buffer,
        options?: InvokeArguments);
    constructor(
        injector: Injector,
        transport: Transport,
        transportOpts: TransportOpts,
        raw: Buffer,
        headerDelimiter?: Buffer,
        options?: InvokeArguments);
    constructor(
        injector: Injector,
        transport: Transport,
        transportOpts: TransportOpts,
        packBuff: Packet | Buffer,
        headerDelimiter?: Buffer,
        options?: InvokeArguments) {
        super(injector, options);
        this.transport = transport;
        this.transportOpts = transportOpts;
        if (isBuffer(packBuff)) {
            this.raw = packBuff;
        } else {
            this.packet = packBuff;
        }
        this.headerDelimiter = headerDelimiter;

    }
}

/**
 * Encode interceptor is a chainable behavior modifier for `Encoders`.
 * 
 * 加密拦截器。
 */
export interface EncodeInterceptor extends Interceptor<Context, Buffer> { }

@Abstract()
export abstract class Encoder implements Handler<Context, Buffer> {
    abstract handle(ctx: Context): Observable<Buffer>;
}

@Abstract()
export abstract class EncoderBackend implements Backend<Context, Buffer> {
    abstract handle(ctx: Context): Observable<Buffer>;
}

/**
 * Decode interceptor is a chainable behavior modifier for `Decoders`.
 * 
 * 解密拦截器。
 */
export interface DecodeInterceptor extends Interceptor<Context, Packet> { }

@Abstract()
export abstract class Decoder implements Handler<Context, Packet> {
    abstract handle(ctx: Context): Observable<Packet>;
}

@Abstract()
export abstract class DecoderBackend implements Backend<Context, Packet> {
    abstract handle(ctx: Context): Observable<Packet>;
}




