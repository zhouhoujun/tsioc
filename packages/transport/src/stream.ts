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

    addListener(event: 'aborted', listener: () => void): this;
    addListener(event: 'close', listener: () => void): this;
    addListener(event: 'data', listener: (chunk: Buffer | string) => void): this;
    addListener(event: 'drain', listener: () => void): this;
    addListener(event: 'end', listener: () => void): this;
    addListener(event: 'readable', listener: () => void): this;
    addListener(event: 'pause', listener: () => void): this;
    addListener(event: 'resume', listener: () => void): this;
    addListener(event: 'error', listener: (err: Error) => void): this;
    addListener(event: 'finish', listener: () => void): this;
    addListener(event: 'frameError', listener: (frameType: number, errorCode: number) => void): this;
    addListener(event: 'pipe', listener: (src: Readable) => void): this;
    addListener(event: 'unpipe', listener: (src: Readable) => void): this;
    addListener(event: 'streamClosed', listener: (code: number) => void): this;
    addListener(event: 'timeout', listener: () => void): this;
    addListener(event: 'trailers', listener: (trailers: IncomingHeaders, flags: number) => void): this;
    addListener(event: 'wantTrailers', listener: () => void): this;
    addListener(event: string | symbol, listener: (...args: any[]) => void): this {
        return this._addListener(event, listener);
    }
    protected _addListener(event: string | symbol, listener: (...args: any[]) => void): this {
        return super.addListener(event, listener);
    }

    emit(event: 'aborted'): boolean;
    emit(event: 'close'): boolean;
    emit(event: 'data', chunk: Buffer | string): boolean;
    emit(event: 'drain'): boolean;
    emit(event: 'end'): boolean;
    emit(event: 'readable'): boolean;
    emit(event: 'pause'): boolean;
    emit(event: 'resume'): boolean;
    emit(event: 'error', err: Error): boolean;
    emit(event: 'finish'): boolean;
    emit(event: 'frameError', frameType: number, errorCode: number): boolean;
    emit(event: 'pipe', src: Readable): boolean;
    emit(event: 'unpipe', src: Readable): boolean;
    emit(event: 'streamClosed', code: number): boolean;
    emit(event: 'timeout'): boolean;
    emit(event: 'trailers', trailers: IncomingHeaders, flags: number): boolean;
    emit(event: 'wantTrailers'): boolean;
    emit(event: string | symbol, ...args: any[]): boolean {
        return this._emit(event, ...args);
    }
    protected _emit(event: string | symbol, ...args: any[]): boolean {
        return super.emit(event, ...args);
    }

    
    on(event: 'aborted', listener: () => void): this;
    on(event: 'close', listener: () => void): this;
    on(event: 'data', listener: (chunk: Buffer) => void): this;
    on(event: 'drain', listener: () => void): this;
    on(event: 'end', listener: () => void): this;
    on(event: 'readable', listener: () => void): this;
    on(event: 'pause', listener: () => void): this;
    on(event: 'resume', listener: () => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
    on(event: 'finish', listener: () => void): this;
    on(event: 'frameError', listener: (frameType: number, errorCode: number) => void): this;
    on(event: 'pipe', listener: (src: Readable) => void): this;
    on(event: 'unpipe', listener: (src: Readable) => void): this;
    on(event: 'streamClosed', listener: (code: number) => void): this;
    on(event: 'timeout', listener: () => void): this;
    on(event: 'trailers', listener: (trailers: IncomingHeaders, flags: number) => void): this;
    on(event: 'wantTrailers', listener: () => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this {
        return this._on(event, listener);
    }
    protected _on(event: string | symbol, listener: (...args: any[]) => void): this {
        return super.on(event, listener);
    }


    once(event: 'aborted', listener: () => void): this;
    once(event: 'close', listener: () => void): this;
    once(event: 'data', listener: (chunk: Buffer | string) => void): this;
    once(event: 'drain', listener: () => void): this;
    once(event: 'end', listener: () => void): this;
    once(event: 'readable', listener: () => void): this;
    once(event: 'pause', listener: () => void): this;
    once(event: 'resume', listener: () => void): this;
    once(event: 'error', listener: (err: Error) => void): this;
    once(event: 'finish', listener: () => void): this;
    once(event: 'frameError', listener: (frameType: number, errorCode: number) => void): this;
    once(event: 'pipe', listener: (src: Readable) => void): this;
    once(event: 'unpipe', listener: (src: Readable) => void): this;
    once(event: 'streamClosed', listener: (code: number) => void): this;
    once(event: 'timeout', listener: () => void): this;
    once(event: 'trailers', listener: (trailers: IncomingHeaders, flags: number) => void): this;
    once(event: 'wantTrailers', listener: () => void): this;
    once(event: string | symbol, listener: (...args: any[]) => void): this {
        return this._once(event, listener);
    }
    protected _once(event: string | symbol, listener: (...args: any[]) => void): this {
        return super.once(event, listener);
    }


    prependListener(event: 'aborted', listener: () => void): this;
    prependListener(event: 'close', listener: () => void): this;
    prependListener(event: 'data', listener: (chunk: Buffer | string) => void): this;
    prependListener(event: 'drain', listener: () => void): this;
    prependListener(event: 'end', listener: () => void): this;
    prependListener(event: 'pause', listener: () => void): this;
    prependListener(event: 'resume', listener: () => void): this;
    prependListener(event: 'readable', listener: () => void): this;
    prependListener(event: 'error', listener: (err: Error) => void): this;
    prependListener(event: 'finish', listener: () => void): this;
    prependListener(event: 'frameError', listener: (frameType: number, errorCode: number) => void): this;
    prependListener(event: 'pipe', listener: (src: Readable) => void): this;
    prependListener(event: 'unpipe', listener: (src: Readable) => void): this;
    prependListener(event: 'streamClosed', listener: (code: number) => void): this;
    prependListener(event: 'timeout', listener: () => void): this;
    prependListener(event: 'trailers', listener: (trailers: IncomingHeaders, flags: number) => void): this;
    prependListener(event: 'wantTrailers', listener: () => void): this;
    prependListener(event: string | symbol, listener: (...args: any[]) => void): this {
        return this._prependListener(event, listener);
    }
    protected _prependListener(event: string | symbol, listener: (...args: any[]) => void): this {
        return super.prependListener(event, listener);
    }

    
    prependOnceListener(event: 'aborted', listener: () => void): this;
    prependOnceListener(event: 'close', listener: () => void): this;
    prependOnceListener(event: 'data', listener: (chunk: Buffer | string) => void): this;
    prependOnceListener(event: 'drain', listener: () => void): this;
    prependOnceListener(event: 'end', listener: () => void): this;
    prependOnceListener(event: 'readable', listener: () => void): this;
    prependOnceListener(event: 'pause', listener: () => void): this;
    prependOnceListener(event: 'resume', listener: () => void): this;
    prependOnceListener(event: 'error', listener: (err: Error) => void): this;
    prependOnceListener(event: 'finish', listener: () => void): this;
    prependOnceListener(event: 'frameError', listener: (frameType: number, errorCode: number) => void): this;
    prependOnceListener(event: 'pipe', listener: (src: Readable) => void): this;
    prependOnceListener(event: 'unpipe', listener: (src: Readable) => void): this;
    prependOnceListener(event: 'streamClosed', listener: (code: number) => void): this;
    prependOnceListener(event: 'timeout', listener: () => void): this;
    prependOnceListener(event: 'trailers', listener: (trailers: IncomingHeaders, flags: number) => void): this;
    prependOnceListener(event: 'wantTrailers', listener: () => void): this;
    prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this {
        return this._prependOnceListener(event, listener);
    }
    protected _prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this {
        return super.prependOnceListener(event, listener);
    }
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

