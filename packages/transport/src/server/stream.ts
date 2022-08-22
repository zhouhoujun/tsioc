import { OutgoingHeaders } from '@tsdi/core';
import { isFunction } from '@tsdi/ioc';
import { Connection } from '../connection';
import { hdr } from '../consts';
import { HeandersSentExecption, InvalidStreamExecption, NestedPushExecption, PushDisabledExecption } from '../execptions';
import { SteamOptions, TransportStream } from '../stream';



export class ServerStream extends TransportStream {

    readonly authority: string;
    constructor(connection: Connection, streamId: number, opts: SteamOptions, protected headers: OutgoingHeaders) {
        super(connection, opts)
        this.id = streamId;
        this.authority = this.getAuthority(headers);
    }

    getAuthority(headers: OutgoingHeaders): string {
        return headers[hdr.AUTHORITY] ?? headers[hdr.HOST] as string ?? '';
    }

    /**
     * True if the remote peer accepts push streams
     */
    get pushAllowed() {
        return !this.destroyed &&
            !this.closed &&
            !this.connection.closed &&
            !this.connection.destroyed
        // && this.connection.remoteSettings.enablePush;
    }

    protected proceed(): void {
        throw new Error('Method not implemented.');
    }
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
    pushStream(headers: OutgoingHeaders, callback?: (err: Error | null, pushStream: ServerStream, headers: OutgoingHeaders) => void): void;
    pushStream(
        headers: OutgoingHeaders,
        options?: {
            exclusive?: boolean;
            parent?: number;
            weight?: number;
            silent?: boolean;
        },
        callback?: (err: Error | null, pushStream: ServerStream, headers: OutgoingHeaders) => void): void;
    pushStream(headers: OutgoingHeaders, arg?: any, callback?: (err: Error | null, pushStream: ServerStream, headers: OutgoingHeaders) => void): void {
        if (this.pushAllowed) {
            throw new PushDisabledExecption();
        }
        if (this.streamId! % 2 === 0) {
            throw new NestedPushExecption();
        }

        this._updateTimer();
        let options: {
            exclusive?: boolean;
            parent?: number;
            weight?: number;
            silent?: boolean;
        } | undefined;
        if (isFunction(arg)) {
            callback = arg;
            options = undefined;
        } else {
            options = arg;
        }
        
    }

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
    respond(headers?: OutgoingHeaders, options?: {
        endStream?: boolean;
        waitForTrailers?: boolean;
    }): void {
        if (this.destroyed || this.closed) throw new InvalidStreamExecption();
        if (this.headersSent) throw new HeandersSentExecption();
        const opts = { ...options };

        opts.endStream

    }
}

