import { Abstract } from '@tsdi/ioc';
import { IncomingHeaders } from '@tsdi/core';
import { Duplex, Readable } from 'stream';
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
    abstract addListener(event: 'aborted', listener: () => void): this;
    abstract addListener(event: 'close', listener: () => void): this;
    abstract addListener(event: 'data', listener: (chunk: Buffer | string) => void): this;
    abstract addListener(event: 'drain', listener: () => void): this;
    abstract addListener(event: 'end', listener: () => void): this;
    abstract addListener(event: 'error', listener: (err: Error) => void): this;
    abstract addListener(event: 'finish', listener: () => void): this;
    abstract addListener(event: 'frameError', listener: (frameType: number, errorCode: number) => void): this;
    abstract addListener(event: 'pipe', listener: (src: Readable) => void): this;
    abstract addListener(event: 'unpipe', listener: (src: Readable) => void): this;
    abstract addListener(event: 'streamClosed', listener: (code: number) => void): this;
    abstract addListener(event: 'timeout', listener: () => void): this;
    abstract addListener(event: 'trailers', listener: (trailers: IncomingHeaders, flags: number) => void): this;
    abstract addListener(event: 'wantTrailers', listener: () => void): this;
    abstract addListener(event: string | symbol, listener: (...args: any[]) => void): this;
    abstract emit(event: 'aborted'): boolean;
    abstract emit(event: 'close'): boolean;
    abstract emit(event: 'data', chunk: Buffer | string): boolean;
    abstract emit(event: 'drain'): boolean;
    abstract emit(event: 'end'): boolean;
    abstract emit(event: 'error', err: Error): boolean;
    abstract emit(event: 'finish'): boolean;
    abstract emit(event: 'frameError', frameType: number, errorCode: number): boolean;
    abstract emit(event: 'pipe', src: Readable): boolean;
    abstract emit(event: 'unpipe', src: Readable): boolean;
    abstract emit(event: 'streamClosed', code: number): boolean;
    abstract emit(event: 'timeout'): boolean;
    abstract emit(event: 'trailers', trailers: IncomingHeaders, flags: number): boolean;
    abstract emit(event: 'wantTrailers'): boolean;
    abstract emit(event: string | symbol, ...args: any[]): boolean;
    abstract on(event: 'aborted', listener: () => void): this;
    abstract on(event: 'close', listener: () => void): this;
    abstract on(event: 'data', listener: (chunk: Buffer | string) => void): this;
    abstract on(event: 'drain', listener: () => void): this;
    abstract on(event: 'end', listener: () => void): this;
    abstract on(event: 'error', listener: (err: Error) => void): this;
    abstract on(event: 'finish', listener: () => void): this;
    abstract on(event: 'frameError', listener: (frameType: number, errorCode: number) => void): this;
    abstract on(event: 'pipe', listener: (src: Readable) => void): this;
    abstract on(event: 'unpipe', listener: (src: Readable) => void): this;
    abstract on(event: 'streamClosed', listener: (code: number) => void): this;
    abstract on(event: 'timeout', listener: () => void): this;
    abstract on(event: 'trailers', listener: (trailers: IncomingHeaders, flags: number) => void): this;
    abstract on(event: 'wantTrailers', listener: () => void): this;
    abstract on(event: string | symbol, listener: (...args: any[]) => void): this;
    abstract once(event: 'aborted', listener: () => void): this;
    abstract once(event: 'close', listener: () => void): this;
    abstract once(event: 'data', listener: (chunk: Buffer | string) => void): this;
    abstract once(event: 'drain', listener: () => void): this;
    abstract once(event: 'end', listener: () => void): this;
    abstract once(event: 'error', listener: (err: Error) => void): this;
    abstract once(event: 'finish', listener: () => void): this;
    abstract once(event: 'frameError', listener: (frameType: number, errorCode: number) => void): this;
    abstract once(event: 'pipe', listener: (src: Readable) => void): this;
    abstract once(event: 'unpipe', listener: (src: Readable) => void): this;
    abstract once(event: 'streamClosed', listener: (code: number) => void): this;
    abstract once(event: 'timeout', listener: () => void): this;
    abstract once(event: 'trailers', listener: (trailers: IncomingHeaders, flags: number) => void): this;
    abstract once(event: 'wantTrailers', listener: () => void): this;
    abstract once(event: string | symbol, listener: (...args: any[]) => void): this;
    abstract prependListener(event: 'aborted', listener: () => void): this;
    abstract prependListener(event: 'close', listener: () => void): this;
    abstract prependListener(event: 'data', listener: (chunk: Buffer | string) => void): this;
    abstract prependListener(event: 'drain', listener: () => void): this;
    abstract prependListener(event: 'end', listener: () => void): this;
    abstract prependListener(event: 'error', listener: (err: Error) => void): this;
    abstract prependListener(event: 'finish', listener: () => void): this;
    abstract prependListener(event: 'frameError', listener: (frameType: number, errorCode: number) => void): this;
    abstract prependListener(event: 'pipe', listener: (src: Readable) => void): this;
    abstract prependListener(event: 'unpipe', listener: (src: Readable) => void): this;
    abstract prependListener(event: 'streamClosed', listener: (code: number) => void): this;
    abstract prependListener(event: 'timeout', listener: () => void): this;
    abstract prependListener(event: 'trailers', listener: (trailers: IncomingHeaders, flags: number) => void): this;
    abstract prependListener(event: 'wantTrailers', listener: () => void): this;
    abstract prependListener(event: string | symbol, listener: (...args: any[]) => void): this;
    abstract prependOnceListener(event: 'aborted', listener: () => void): this;
    abstract prependOnceListener(event: 'close', listener: () => void): this;
    abstract prependOnceListener(event: 'data', listener: (chunk: Buffer | string) => void): this;
    abstract prependOnceListener(event: 'drain', listener: () => void): this;
    abstract prependOnceListener(event: 'end', listener: () => void): this;
    abstract prependOnceListener(event: 'error', listener: (err: Error) => void): this;
    abstract prependOnceListener(event: 'finish', listener: () => void): this;
    abstract prependOnceListener(event: 'frameError', listener: (frameType: number, errorCode: number) => void): this;
    abstract prependOnceListener(event: 'pipe', listener: (src: Readable) => void): this;
    abstract prependOnceListener(event: 'unpipe', listener: (src: Readable) => void): this;
    abstract prependOnceListener(event: 'streamClosed', listener: (code: number) => void): this;
    abstract prependOnceListener(event: 'timeout', listener: () => void): this;
    abstract prependOnceListener(event: 'trailers', listener: (trailers: IncomingHeaders, flags: number) => void): this;
    abstract prependOnceListener(event: 'wantTrailers', listener: () => void): this;
    abstract prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this;
}


export interface SessionSettings {
    headerTableSize?: number | undefined;
    enablePush?: boolean | undefined;
    initialWindowSize?: number | undefined;
    maxFrameSize?: number | undefined;
    maxConcurrentStreams?: number | undefined;
    maxHeaderListSize?: number | undefined;
    enableConnectProtocol?: boolean | undefined;
}

@Abstract()
export abstract class TransportSession extends Duplex {
    /**
     * Gracefully closes the `TransportSession`, allowing any existing streams to
     * complete on their own and preventing new `TransportSession` instances from being
     * created. Once closed, `TransportSession.destroy()`_might_ be called if there
     * are no open `TransportSession` instances.
     *
     * If specified, the `callback` function is registered as a handler for the`'close'` event.
     * @since v9.4.0
     */
    abstract close(): Promise<void>;
    // /**
    //  * Immediately terminates the `TransportSession` and the associated `net.Socket` or`tls.TLSSocket`.
    //  *
    //  * Once destroyed, the `TransportSession` will emit the `'close'` event. If `error`is not undefined, an `'error'` event will be emitted immediately before the`'close'` event.
    //  *
    //  * If there are any remaining open `TransportSessions` associated with the`TransportSession`, those will also be destroyed.
    //  * @since v8.4.0
    //  * @param error An `Error` object if the `TransportSession` is being destroyed due to an error.
    //  * @param code The HTTP/2 error code to send in the final `GOAWAY` frame. If unspecified, and `error` is not undefined, the default is `INTERNAL_ERROR`, otherwise defaults to `NO_ERROR`.
    //  */
    // abstract destroy(error?: Error, code?: number): void;

    abstract addListener(event: 'close', listener: () => void): this;
    abstract addListener(event: 'error', listener: (err: Error) => void): this;
    abstract addListener(event: 'frameError', listener: (frameType: number, errorCode: number, streamID: number) => void): this;
    abstract addListener(event: 'goaway', listener: (errorCode: number, lastStreamID: number, opaqueData: Buffer) => void): this;
    abstract addListener(event: 'localSettings', listener: (settings: SessionSettings) => void): this;
    abstract addListener(event: 'ping', listener: () => void): this;
    abstract addListener(event: 'remoteSettings', listener: (settings: SessionSettings) => void): this;
    abstract addListener(event: 'timeout', listener: () => void): this;
    abstract addListener(event: string | symbol, listener: (...args: any[]) => void): this;

    abstract emit(event: 'close'): boolean;
    abstract emit(event: 'error', err: Error): boolean;
    abstract emit(event: 'frameError', frameType: number, errorCode: number, streamID: number): boolean;
    abstract emit(event: 'goaway', errorCode: number, lastStreamID: number, opaqueData: Buffer): boolean;
    abstract emit(event: 'localSettings', settings: SessionSettings): boolean;
    abstract emit(event: 'ping'): boolean;
    abstract emit(event: 'remoteSettings', settings: SessionSettings): boolean;
    abstract emit(event: 'timeout'): boolean;
    abstract emit(event: string | symbol, ...args: any[]): boolean;
    abstract on(event: 'close', listener: () => void): this;
    abstract on(event: 'error', listener: (err: Error) => void): this;
    abstract on(event: 'frameError', listener: (frameType: number, errorCode: number, streamID: number) => void): this;
    abstract on(event: 'goaway', listener: (errorCode: number, lastStreamID: number, opaqueData: Buffer) => void): this;
    abstract on(event: 'localSettings', listener: (settings: SessionSettings) => void): this;
    abstract on(event: 'ping', listener: () => void): this;
    abstract on(event: 'remoteSettings', listener: (settings: SessionSettings) => void): this;
    abstract on(event: 'timeout', listener: () => void): this;
    abstract on(event: string | symbol, listener: (...args: any[]) => void): this;
    abstract once(event: 'close', listener: () => void): this;
    abstract once(event: 'error', listener: (err: Error) => void): this;
    abstract once(event: 'frameError', listener: (frameType: number, errorCode: number, streamID: number) => void): this;
    abstract once(event: 'goaway', listener: (errorCode: number, lastStreamID: number, opaqueData: Buffer) => void): this;
    abstract once(event: 'localSettings', listener: (settings: SessionSettings) => void): this;
    abstract once(event: 'ping', listener: () => void): this;
    abstract once(event: 'remoteSettings', listener: (settings: SessionSettings) => void): this;
    abstract once(event: 'timeout', listener: () => void): this;
    abstract once(event: string | symbol, listener: (...args: any[]) => void): this;
    abstract prependListener(event: 'close', listener: () => void): this;
    abstract prependListener(event: 'error', listener: (err: Error) => void): this;
    abstract prependListener(event: 'frameError', listener: (frameType: number, errorCode: number, streamID: number) => void): this;
    abstract prependListener(event: 'goaway', listener: (errorCode: number, lastStreamID: number, opaqueData: Buffer) => void): this;
    abstract prependListener(event: 'localSettings', listener: (settings: SessionSettings) => void): this;
    abstract prependListener(event: 'ping', listener: () => void): this;
    abstract prependListener(event: 'remoteSettings', listener: (settings: SessionSettings) => void): this;
    abstract prependListener(event: 'timeout', listener: () => void): this;
    abstract prependListener(event: string | symbol, listener: (...args: any[]) => void): this;
    abstract prependOnceListener(event: 'close', listener: () => void): this;
    abstract prependOnceListener(event: 'error', listener: (err: Error) => void): this;
    abstract prependOnceListener(event: 'frameError', listener: (frameType: number, errorCode: number, streamID: number) => void): this;
    abstract prependOnceListener(event: 'goaway', listener: (errorCode: number, lastStreamID: number, opaqueData: Buffer) => void): this;
    abstract prependOnceListener(event: 'localSettings', listener: (settings: SessionSettings) => void): this;
    abstract prependOnceListener(event: 'ping', listener: () => void): this;
    abstract prependOnceListener(event: 'remoteSettings', listener: (settings: SessionSettings) => void): this;
    abstract prependOnceListener(event: 'timeout', listener: () => void): this;
    abstract prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this;
}

