import { Endpoint, OutgoingHeaders } from '@tsdi/core';
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
export abstract class ServerSession extends TransportSession {
    /**
     * bind request handle with endpoint.
     * @param endpoint 
     */
    abstract bind(endpoint: Endpoint): Promise<void>;

    // addListener(event: 'close', listener: () => void): this;
    // addListener(event: 'error', listener: (err: Error) => void): this;
    // addListener(event: 'frameError', listener: (frameType: number, errorCode: number, streamID: number) => void): this;
    // addListener(event: 'goaway', listener: (errorCode: number, lastStreamID: number, opaqueData: Buffer) => void): this;
    // addListener(event: 'localSettings', listener: (settings: SessionSettings) => void): this;
    // addListener(event: 'ping', listener: () => void): this;
    // addListener(event: 'remoteSettings', listener: (settings: SessionSettings) => void): this;
    // addListener(event: 'timeout', listener: () => void): this;
    // addListener(event: 'connect', listener: (session: ServerSession, socket: Socket) => void): this;
    // addListener(event: 'stream', listener: (stream: ServerStream, headers: IncomingHeaders, flags: number) => void): this;
    // addListener(event: string | symbol, listener: (...args: any[]) => void): this {
    //     return this._addListener(event, listener);
    // }

    // emit(event: 'close'): boolean;
    // emit(event: 'error', err: Error): boolean;
    // emit(event: 'frameError', frameType: number, errorCode: number, streamID: number): boolean;
    // emit(event: 'goaway', errorCode: number, lastStreamID: number, opaqueData: Buffer): boolean;
    // emit(event: 'localSettings', settings: SessionSettings): boolean;
    // emit(event: 'ping'): boolean;
    // emit(event: 'remoteSettings', settings: SessionSettings): boolean;
    // emit(event: 'timeout'): boolean;
    // emit(event: 'connect', session: ServerSession, socket: Socket): boolean;
    // emit(event: 'stream', stream: ServerStream, headers: IncomingHeaders, flags: number): boolean;
    // emit(event: string | symbol, ...args: any[]): boolean {
    //     return this._emit(event, ...args);
    // }

    // on(event: 'close', listener: () => void): this;
    // on(event: 'error', listener: (err: Error) => void): this;
    // on(event: 'frameError', listener: (frameType: number, errorCode: number, streamID: number) => void): this;
    // on(event: 'goaway', listener: (errorCode: number, lastStreamID: number, opaqueData: Buffer) => void): this;
    // on(event: 'localSettings', listener: (settings: SessionSettings) => void): this;
    // on(event: 'ping', listener: () => void): this;
    // on(event: 'remoteSettings', listener: (settings: SessionSettings) => void): this;
    // on(event: 'timeout', listener: () => void): this;
    // on(event: 'connect', listener: (session: ServerSession, socket: Socket) => void): this;
    // on(event: 'stream', listener: (stream: ServerStream, headers: IncomingHeaders, flags: number) => void): this;
    // on(event: string | symbol, listener: (...args: any[]) => void): this {
    //     return this._on(event, listener);
    // }

    // once(event: 'close', listener: () => void): this;
    // once(event: 'error', listener: (err: Error) => void): this;
    // once(event: 'frameError', listener: (frameType: number, errorCode: number, streamID: number) => void): this;
    // once(event: 'goaway', listener: (errorCode: number, lastStreamID: number, opaqueData: Buffer) => void): this;
    // once(event: 'localSettings', listener: (settings: SessionSettings) => void): this;
    // once(event: 'ping', listener: () => void): this;
    // once(event: 'remoteSettings', listener: (settings: SessionSettings) => void): this;
    // once(event: 'timeout', listener: () => void): this;
    // once(event: 'connect', listener: (session: ServerSession, socket: Socket) => void): this;
    // once(event: 'stream', listener: (stream: ServerStream, headers: IncomingHeaders, flags: number) => void): this;
    // once(event: string | symbol, listener: (...args: any[]) => void): this {
    //     return this._once(event, listener);
    // }

    // prependListener(event: 'close', listener: () => void): this;
    // prependListener(event: 'error', listener: (err: Error) => void): this;
    // prependListener(event: 'frameError', listener: (frameType: number, errorCode: number, streamID: number) => void): this;
    // prependListener(event: 'goaway', listener: (errorCode: number, lastStreamID: number, opaqueData: Buffer) => void): this;
    // prependListener(event: 'localSettings', listener: (settings: SessionSettings) => void): this;
    // prependListener(event: 'ping', listener: () => void): this;
    // prependListener(event: 'remoteSettings', listener: (settings: SessionSettings) => void): this;
    // prependListener(event: 'timeout', listener: () => void): this;
    // prependListener(event: 'connect', listener: (session: ServerSession, socket: Socket) => void): this;
    // prependListener(event: 'stream', listener: (stream: ServerStream, headers: IncomingHeaders, flags: number) => void): this;
    // prependListener(event: string | symbol, listener: (...args: any[]) => void): this {
    //     return this._prependListener(event, listener);
    // }

    // prependOnceListener(event: 'close', listener: () => void): this;
    // prependOnceListener(event: 'error', listener: (err: Error) => void): this;
    // prependOnceListener(event: 'frameError', listener: (frameType: number, errorCode: number, streamID: number) => void): this;
    // prependOnceListener(event: 'goaway', listener: (errorCode: number, lastStreamID: number, opaqueData: Buffer) => void): this;
    // prependOnceListener(event: 'localSettings', listener: (settings: SessionSettings) => void): this;
    // prependOnceListener(event: 'ping', listener: () => void): this;
    // prependOnceListener(event: 'remoteSettings', listener: (settings: SessionSettings) => void): this;
    // prependOnceListener(event: 'timeout', listener: () => void): this;
    // prependOnceListener(event: 'connect', listener: (session: ServerSession, socket: Socket) => void): this;
    // prependOnceListener(event: 'stream', listener: (stream: ServerStream, headers: IncomingHeaders, flags: number) => void): this;
    // prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this {
    //     return this._prependOnceListener(event, listener);
    // }
}


@Abstract()
export abstract class ServerSessionBuilder {
    abstract build(listenOpts: ProtocolServerOpts): Promise<ServerSession>;
}

