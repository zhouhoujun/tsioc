import { Backend, Handler, Interceptor } from '@tsdi/core';
import { Abstract, DefaultInvocationContext, Injector, InvokeArguments } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { HeaderPacket, Packet } from './packet';
import { HybirdTransport, Transport } from './protocols';
import { TransportSession } from './TransportFactory';
import { isBuffer } from './utils';


/**
 * coding context.
 */
export class Context<TPacket extends Packet = Packet> extends DefaultInvocationContext {

    readonly transport: Transport | HybirdTransport;
    readonly session: TransportSession;
    public packet?: Packet;
    public headers?: HeaderPacket;
    public raw?: Buffer;
    readonly delimiter?: Buffer;
    readonly headerDelimiter?: Buffer;
    readonly serverSide: boolean;

    constructor(
        injector: Injector,
        session: TransportSession,
        packet: TPacket,
        headers?: HeaderPacket,
        delimiter?: Buffer,
        headerDelimiter?: Buffer,
        options?: InvokeArguments);
    constructor(
        injector: Injector,
        transportOpts: TransportSession,
        raw: Buffer,
        headers?: HeaderPacket,
        delimiter?: Buffer,
        headerDelimiter?: Buffer,
        options?: InvokeArguments);
    constructor(
        injector: Injector,
        session: TransportSession,
        packBuff: TPacket | Buffer,
        headers?: HeaderPacket,
        delimiter?: Buffer,
        headerDelimiter?: Buffer,
        options?: InvokeArguments) {
        super(injector, options);
        this.transport = session.options.transport!;
        this.serverSide = session.options.serverSide == true;
        this.delimiter = delimiter;
        this.session = session;
        this.headers = headers;
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
export interface DecodeInterceptor<T extends Packet = Packet> extends Interceptor<Context, T> { }

@Abstract()
export abstract class Decoder<T extends Packet = Packet> implements Handler<Context, T> {
    abstract handle(ctx: Context<T>): Observable<T>;
}

@Abstract()
export abstract class DecoderBackend<T extends Packet = Packet> implements Backend<Context, T> {
    abstract handle(ctx: Context<T>): Observable<T>;
}

