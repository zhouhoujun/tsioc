import { Endpoint, IncomingHeaders, OutgoingHeaders } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Duplex, DuplexOptions } from 'stream';
import { Connection, ConnectionOpts } from '../connection';
import { TransportStream } from '../stream';
import { TransportContext } from './context';
import { ListenOpts, TransportServerOpts } from './options';




@Abstract()
export abstract class ServerStream extends TransportStream {

    /**
     * Initiates a push stream. The callback is invoked with the new `TransportStream`instance created for the push stream passed as the second argument, or an`Error` passed as the first argument.
     *
     * ```js
     * const server = injector.get(ServerStreamBuilder).build(listenOpts);
     * server.on('stream', (stream) => {
     *   stream.respond({ ':status': 200 });
     *   stream.pushStream({ ':path': '/' }, (err, pushStream, headers) => {
     *     if (err) throw err;
     *     pushStream.respond({ ':status': 200 });
     *     pushStream.end('some pushed data');
     *   });
     *   stream.end('some data');
     * });
     * ```
     *
     * Setting the weight of a push stream is not allowed in the `HEADERS` frame. Pass
     * a `weight` value to `transportStream.priority` with the `silent` option set to`true` to enable server-side bandwidth balancing between concurrent streams.
     *
     * Calling `transportStream.pushStream()` from within a pushed stream is not permitted
     * and will throw an error.
     * @since v8.4.0
     * @param callback Callback that is called once the push stream has been initiated.
     */
    abstract pushStream(headers: OutgoingHeaders, callback?: (err: Error | null, pushStream: ServerStream, headers: OutgoingHeaders) => void): void;
    abstract pushStream(
        headers: OutgoingHeaders,
        options?: {
            exclusive?: boolean;
            parent?: number;
            weight?: number;
            silent?: boolean;
        },
        callback?: (err: Error | null, pushStream: ServerStream, headers: OutgoingHeaders) => void): void;

    /**
     * ```js
     * const server = injector.get(ServerStreamBuilder).build(listenOpts);
     * server.on('stream', (stream) => {
     *   stream.respond({ ':status': 200 });
     *   stream.end('some data');
     * });
     * ```
     *
     * When the `options.waitForTrailers` option is set, the `'wantTrailers'` event
     * will be emitted immediately after queuing the last chunk of payload data to be
     * sent. The `transportStream.sendTrailers()` method can then be used to sent trailing
     * header fields to the peer.
     *
     * When `options.waitForTrailers` is set, the `TransportStream` will not automatically
     * close when the final `DATA` frame is transmitted. User code must call either`transportStream.sendTrailers()` or `transportStream.close()` to close the`TransportStream`.
     *
     * ```js
     * const server = injector.get(ServerStreamBuilder).build(listenOpts);
     * server.on('stream', (stream) => {
     *   stream.respond({ ':status': 200 }, { waitForTrailers: true });
     *   stream.on('wantTrailers', () => {
     *     stream.sendTrailers({ ABC: 'some value to send' });
     *   });
     *   stream.end('some data');
     * });
     * ```
     * @since v8.4.0
     */
    abstract respond(headers?: OutgoingHeaders, options?: {
        endStream?: boolean;
        waitForTrailers?: boolean;
    }): void;
}

@Abstract()
export abstract class ServerSession extends Connection {
    readonly server: any;

    protected override bindEvents(opts?: ConnectionOpts): void {
        this._parser.on('data', (chunk)=> {
            
        })
    }

    addListener(event: 'connect', listener: (session: ServerSession, socket: Duplex) => void): this;
    addListener(event: 'stream', listener: (stream: ServerStream, headers: IncomingHeaders, flags: number) => void): this;
    addListener(event: string | symbol, listener: (...args: any[]) => void): this;
    addListener(event: string | symbol, listener: (...args: any[]) => void): this {
        return this._addListener(event, listener);
    }

    emit(event: 'connect', session: ServerSession, socket: Duplex): boolean;
    emit(event: 'stream', stream: ServerSession, headers: IncomingHeaders, flags: number): boolean;
    emit(event: string | symbol, ...args: any[]): boolean;
    emit(event: string | symbol, ...args: any[]): boolean {
        return this._emit(event, ...args);
    }

    on(event: 'connect', listener: (session: ServerSession, socket: Duplex) => void): this;
    on(event: 'stream', listener: (stream: ServerStream, headers: IncomingHeaders, flags: number) => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this {
        return this._on(event, listener);
    }

    once(event: 'connect', listener: (session: ServerSession, socket: Duplex) => void): this;
    once(event: 'stream', listener: (stream: ServerStream, headers: IncomingHeaders, flags: number) => void): this;
    once(event: string | symbol, listener: (...args: any[]) => void): this;
    once(event: string | symbol, listener: (...args: any[]) => void): this {
        return this._once(event, listener);
    }

    prependListener(event: 'connect', listener: (session: ServerSession, socket: Duplex) => void): this;
    prependListener(event: 'stream', listener: (stream: ServerStream, headers: IncomingHeaders, flags: number) => void): this;
    prependListener(event: string | symbol, listener: (...args: any[]) => void): this;
    prependListener(event: string | symbol, listener: (...args: any[]) => void): this {
        return this._prependListener(event, listener);
    }

    prependOnceListener(event: 'connect', listener: (session: ServerSession, socket: Duplex) => void): this;
    prependOnceListener(event: 'stream', listener: (stream: ServerStream, headers: IncomingHeaders, flags: number) => void): this;
    prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this;
    prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this {
        return this._prependOnceListener(event, listener);
    }
    
}

export interface Closeable {
    /**
     * Stops the server from accepting new connections and keeps existing
     * connections. This function is asynchronous, the server is finally closed
     * when all connections are ended and the server emits a `'close'` event.
     * The optional `callback` will be called once the `'close'` event occurs. Unlike
     * that event, it will be called with an `Error` as its only argument if the server
     * was not open when it was closed.
     * @since v0.1.90
     * @param callback Called when the server is closed.
     */
    close(callback?: (err?: Error) => void): this;
}

@Abstract()
export abstract class ServerBuilder<T extends Closeable = Closeable> {

    abstract buildServer(opts: TransportServerOpts): Promise<T>;

    /**
     * listen
     * @param server 
     * @param opts 
     */
    abstract listen(server: T, opts: ListenOpts): Promise<void>;

    abstract buildContext(stream: ServerStream, headers: IncomingHeaders): TransportContext;

    abstract connect(server: T): Observable<ServerSession>;
    /**
     * handle request.
     * @param context 
     * @param endpoint 
     */
    abstract handle(context: TransportContext, endpoint: Endpoint): void;

}

