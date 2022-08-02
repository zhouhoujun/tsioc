import { Abstract } from '@tsdi/ioc';
import { OutgoingHeaders } from '@tsdi/core';
import { EventEmitter } from 'events';
import { Duplex } from 'stream';
import { Observable } from 'rxjs';

/**
 * transport stream
 */
@Abstract()
export abstract class TransportStream extends Duplex {
    /**
     * Closes the `TransportStream` instance by sending an `RST_STREAM` frame to the
     * connected transport peer.
     * @since v8.4.0
     * @param [code] Unsigned 32-bit integer identifying the error code.
     * @param callback An optional function registered to listen for the `'close'` event.
     */
    abstract close(code?: number, callback?: () => void): void;
    abstract readPacket(): Observable<any>;
}



@Abstract()
export abstract class ClientStream extends TransportStream {

}

export interface ClientRequsetOpts {
    endStream?: boolean | undefined;
    exclusive?: boolean | undefined;
    parent?: number | undefined;
    weight?: number | undefined;
    waitForTrailers?: boolean | undefined;
    signal?: AbortSignal | undefined;
}

@Abstract()
export abstract class TransportSession extends EventEmitter {
    /**
     * Gracefully closes the `TransportSession`, allowing any existing streams to
     * complete on their own and preventing new `TransportSession` instances from being
     * created. Once closed, `TransportSession.destroy()`_might_ be called if there
     * are no open `TransportSession` instances.
     *
     * If specified, the `callback` function is registered as a handler for the`'close'` event.
     * @since v9.4.0
     */
    abstract close(callback?: () => void): void;
    /**
     * Immediately terminates the `TransportSession` and the associated `net.Socket` or`tls.TLSSocket`.
     *
     * Once destroyed, the `TransportSession` will emit the `'close'` event. If `error`is not undefined, an `'error'` event will be emitted immediately before the`'close'` event.
     *
     * If there are any remaining open `TransportSessions` associated with the`TransportSession`, those will also be destroyed.
     * @since v8.4.0
     * @param error An `Error` object if the `TransportSession` is being destroyed due to an error.
     * @param code The HTTP/2 error code to send in the final `GOAWAY` frame. If unspecified, and `error` is not undefined, the default is `INTERNAL_ERROR`, otherwise defaults to `NO_ERROR`.
     */
    abstract destroy(error?: Error, code?: number): void;
}

@Abstract()
export abstract class ClientSessionStream extends EventEmitter {
    abstract request(headers: OutgoingHeaders, options?: ClientRequsetOpts): ClientStream;
}


@Abstract()
export abstract class ClientStreamBuilder {
    abstract build(connectOpts?: Record<string, any>): Observable<TransportStream>;
}


/**
 * Listen options.
 */
@Abstract()
export abstract class ListenOpts {

    /**
    * When provided the corresponding `AbortController` can be used to cancel an asynchronous action.
    */
    signal?: AbortSignal | undefined;
    port?: number | undefined;
    host?: string | undefined;
    backlog?: number | undefined;
    path?: string | undefined;
    exclusive?: boolean | undefined;
    readableAll?: boolean | undefined;
    writableAll?: boolean | undefined;
    /**
     * @default false
     */
    ipv6Only?: boolean | undefined;
}


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
export abstract class ServerStreamBuilder {
    abstract build(listenOpts: ListenOpts): Observable<TransportStream>;
}
