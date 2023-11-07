import { Backend, Handler, Interceptor } from '@tsdi/core';
import { Abstract, DefaultInvocationContext, Injector, InvokeArguments, isFunction, isNil } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { HeaderPacket, Packet, ResponsePacket } from './packet';
import { HybirdTransport, Transport } from './protocols';
import { TransportSession } from './TransportFactory';
import { isBuffer } from './utils';
import { IReadableStream, IWritableStream } from './stream';
import { Incoming, Outgoing } from './socket';


/**
 * coding context.
 */
export class Context<TPacket extends Packet = Packet> extends DefaultInvocationContext {

    readonly transport: Transport | HybirdTransport;
    readonly session: TransportSession;
    public packet?: Packet;
    public headers?: HeaderPacket;
    public raw?: Buffer;
    public readable?: IReadableStream;
    public writable?: IWritableStream;
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
        transportOpts: TransportSession,
        readable: IReadableStream,
        headers?: HeaderPacket,
        delimiter?: Buffer,
        headerDelimiter?: Buffer,
        options?: InvokeArguments);
    constructor(
        injector: Injector,
        transportOpts: TransportSession,
        writable: IWritableStream,
        headers?: HeaderPacket,
        delimiter?: Buffer,
        headerDelimiter?: Buffer,
        options?: InvokeArguments);
    constructor(
        injector: Injector,
        session: TransportSession,
        packBuff: TPacket | Buffer | IReadableStream | IWritableStream,
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
        } else if (session.streamAdapter.isReadable(packBuff)) {
            this.readable = packBuff;
            if (!headers && (packBuff as Incoming).headers) {
                this.headers = {
                    id: (packBuff as Incoming).id,
                    url: (packBuff as Incoming).url,
                    headers: (packBuff as Incoming).headers
                }
            }
        } else if (session.streamAdapter.isWritable(packBuff)) {
            this.writable = packBuff;
            const outgoing = packBuff as any as Outgoing;
            if (isFunction(outgoing.getHeaders) || outgoing.headers) {
                if (!headers) {
                    this.headers = {
                        headers: outgoing.getHeaders?.() ?? outgoing.headers,
                        status: outgoing.statusCode,
                        statusText: outgoing.statusMessage
                    } as ResponsePacket;
                }
                if (!isNil(outgoing.body)) {
                    this.packet = {
                        ...this.headers,
                        payload: outgoing.body
                    }
                }
            }
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
export interface EncodeInterceptor extends Interceptor<Context, Buffer> {}

@Abstract()
export abstract class Encoder implements Handler<Context, Buffer> {
    strategy?: string;
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
export interface DecodeInterceptor<T extends Packet = Packet> extends Interceptor<Context, T> {
    /**
     * the method to implemet decode interceptor.
     * 
     * 解密拦截处理的方法
     * @param input  request input.
     * @param next The next handler in the chain, or the backend
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    intercept(input: Context, next: Handler<Context, T>): Observable<T>;
}

@Abstract()
export abstract class Decoder<T extends Packet = Packet> implements Handler<Context, T> {
    strategy?: string;
    abstract handle(ctx: Context<T>): Observable<T>;
}

@Abstract()
export abstract class DecoderBackend<T extends Packet = Packet> implements Backend<Context, T> {
    abstract handle(ctx: Context<T>): Observable<T>;
}

