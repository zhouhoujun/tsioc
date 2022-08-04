import { Endpoint, IncomingHeaders, OutgoingHeaders } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';
import { TransportSession, TransportStream } from '../stream';
import { ProtocolServerOpts } from './options';




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
export abstract class ServerSession<Socket = any> extends TransportSession {
    /**
     * bind request handle with endpoint.
     * @param endpoint 
     */
    abstract bind(endpoint: Endpoint): Promise<void>;

    abstract addListener(event: 'connect', listener: (session: ServerSession, socket: Socket) => void): this;
    abstract addListener(event: 'stream', listener: (stream: ServerStream, headers: IncomingHeaders, flags: number) => void): this;
    abstract addListener(event: string | symbol, listener: (...args: any[]) => void): this;

    abstract emit(event: 'connect', session: ServerSession, socket: Socket): boolean;
    abstract emit(event: 'stream', stream: ServerStream, headers: IncomingHeaders, flags: number): boolean;
    abstract emit(event: string | symbol, ...args: any[]): boolean;
    abstract on(event: 'connect', listener: (session: ServerSession, socket: Socket) => void): this;
    abstract on(event: 'stream', listener: (stream: ServerStream, headers: IncomingHeaders, flags: number) => void): this;
    abstract on(event: string | symbol, listener: (...args: any[]) => void): this;
    abstract once(event: 'connect', listener: (session: ServerSession, socket: Socket) => void): this;
    abstract once(event: 'stream', listener: (stream: ServerStream, headers: IncomingHeaders, flags: number) => void): this;
    abstract once(event: string | symbol, listener: (...args: any[]) => void): this;
    abstract prependListener(event: 'connect', listener: (session: ServerSession, socket: Socket) => void): this;
    abstract prependListener(event: 'stream', listener: (stream: ServerStream, headers: IncomingHeaders, flags: number) => void): this;
    abstract prependListener(event: string | symbol, listener: (...args: any[]) => void): this;
    abstract prependOnceListener(event: 'connect', listener: (session: ServerSession, socket: Socket) => void): this;
    abstract prependOnceListener(event: 'stream', listener: (stream: ServerStream, headers: IncomingHeaders, flags: number) => void): this;
    abstract prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this;
}


@Abstract()
export abstract class ServerSessionStreamBuilder {
    abstract build(listenOpts: ProtocolServerOpts): Promise<ServerSession>;
}

