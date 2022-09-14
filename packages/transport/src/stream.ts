import { Abstract, Execption, isFunction, isString } from '@tsdi/ioc';
import { IncomingHeaders, OutgoingHeaders, TransportExecption } from '@tsdi/core';
import { Buffer } from 'buffer';
import { Duplex, DuplexOptions, Transform, Readable, TransformCallback } from 'stream';
import { ReadableState, WritableState } from 'readable-stream';
import { Connection } from './connection';
import { ev } from './consts';
import { setTimeout } from 'timers';
import { Closeable, TransportProtocol } from './protocol';
import { isBuffer } from './utils';

/**
* connection options.
*/
export interface SteamOptions extends DuplexOptions, Record<string, any> {
    noError?: number;
    /**
     * packet size limit.
     */
    maxSize?: number;
    /**
     * packet delimiter code.
     */
    delimiter?: string;
    /**
     * packet buffer encoding.
     */
    encoding?: BufferEncoding;
    /**
     * 
     */
    allowHalfOpen?: boolean;
    /**
     * auto destroy or not.
     */
    autoDestroy?: boolean;
}

/**
 * Stream state flags.
 */
export enum StreamStateFlags {
    pending = 0x0,
    ready = 0x1,
    closed = 0x2,
    headersSent = 0x4,
    headRequest = 0x8,
    aborted = 0x10,
    trailers = 0x20
}

export enum TransportStreamFlags {
    none = 0x0,
    emptyPayload = 0x2,
    trailers = 0x4
}

export interface StreamState {
    didRead: boolean;
    flags: StreamStateFlags;
    rstCode?: number;
    writeQueueSize: number;
    trailersReady: boolean;
    endAfterHeaders: boolean;
    shutdownWritableCalled?: boolean;
}

export enum StreamRstStatus {
    none = 0,
    submit = 1,
    force = 2
}


export const STRESM_NO_ERROR = 0;

/**
 * transport stream
 */
@Abstract()
export abstract class TransportStream extends Duplex implements Closeable {

    private _timeout?: any;
    protected _id?: number;
    protected ending?: boolean;
    readonly state: StreamState;
    protected _sentHeaders?: OutgoingHeaders;
    protected _sentTrailers?: any;
    protected _infoHeaders?: any;
    protected _readableState!: ReadableState;
    protected _writableState!: WritableState;
    protected isClient?: boolean;
    private _streamId?: Buffer;
    constructor(readonly connection: Connection, protected opts: SteamOptions) {
        super({ objectMode: true, ...opts });
        this.opts = opts;
        this.cork();

        // Allow our logic for determining whether any reads have happened to
        // work in all situations. This is similar to what we do in _http_incoming.
        this._readableState.readingMore = true;

        this.connection.state.pendingStreams.add(this);

        this.state = {
            didRead: false,
            flags: StreamStateFlags.pending,
            rstCode: opts.noError ?? STRESM_NO_ERROR,
            writeQueueSize: 0,
            trailersReady: false,
            endAfterHeaders: false
        };

        this.connection.on(ev.DATA, this.emit.bind(this, ev.DATA));
        this.connection.on(ev.DRAIN, this.emit.bind(this, ev.DRAIN));
        this.connection.on(ev.ABORTED, this.emit.bind(this, ev.ABORTED));
        this.connection.on(ev.TIMEOUT, this.emit.bind(this, ev.TIMEOUT));
        this.connection.on(ev.ERROR, this.emit.bind(this, ev.ERROR));
        this.connection.on(ev.CLOSE, this.emit.bind(this, ev.CLOSE));
    }

    get id() {
        return this._id;
    }

    get streamId() {
        if (!this._streamId && this._id !== undefined) {
            this._streamId = Buffer.of(this._id)
        }
        return this._streamId;
    }


    get isClosed() {
        return (this as Closeable).closed === true || !!(this.state.flags & StreamStateFlags.closed);
    }

    get bufferSize() {
        // `bufferSize` properties of `net.Socket` are `undefined` when
        // their `_handle` are falsy. Here we avoid the behavior.
        return this.state.writeQueueSize + this.writableLength;
    }

    get endAfterHeaders() {
        return this.state.endAfterHeaders;
    }

    get sentHeaders() {
        return this._sentHeaders;
    }

    get sentTrailers() {
        return this._sentTrailers;
    }

    get sentInfoHeaders() {
        return this._infoHeaders;
    }

    get pending(): boolean {
        return this.id === undefined;
    }

    /**
     * True if the HEADERS frame has been sent
     */
    get headersSent() {
        return !!(this.state.flags & StreamStateFlags.headersSent);
    }

    /**
     *  True if the Stream was aborted abnormally.
     */
    get aborted() {
        return !!(this.state.flags & StreamStateFlags.aborted);
    }

    // True if dealing with a HEAD request
    get headRequest() {
        return !!(this.state.flags & StreamStateFlags.headRequest);
    }

    // The error code reported when this Http2Stream was closed.
    get rstCode() {
        return this.state.rstCode;
    }

    init(id: number) {
        if (this.id !== undefined) return;
        const { state, connection } = this;
        state.flags |= StreamStateFlags.ready;

        connection.state.pendingStreams.delete(this);
        connection.state.streams.set(id, this);
        this._id = id;

        this.uncork();
        const steam = this.connection.transport.streamFilter(this.isClient ? id + 1 : id - 1);
        process.nextTick(() => {
            this.connection
                .pipe(steam)
                .pipe(this);
        });
        this.emit(ev.READY)
    }

    override push(chunk: any, encoding?: BufferEncoding | undefined): boolean {
        this.emit(ev.DATA, chunk);
        return super.push(chunk, encoding);
    }

    override _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
        this.processWrite(false, chunk, encoding, callback)
    }

    override _writev(chunk: any, callback: (error?: Error | null | undefined) => void) {
        this.processWrite(true, chunk, undefined, callback)
    }

    override _final(callback: (error?: Error | null | undefined) => void): void {
        if (this.pending) {
            this.once(ev.READY, () => this._final(callback))
        }

        this.shutdownWritable(callback);
    }

    override _read(size: number): void {
        if (this.destroyed) {
            this.push(null);
            return;
        }
        if (!this.state.didRead) {
            this._readableState.readingMore = false;
            this.state.didRead = true;
        }

        if (!this.pending) {
            this.streamOnResume(size);
        } else {
            this.once(ev.READY, () => this.streamOnResume(size))
        }
    }

    protected processWrite(writev: boolean, chunk: any, encoding: BufferEncoding | undefined, callback: (error?: Error | null | undefined) => void) {
        if (this.pending) {
            this.once(ev.READY, () => {
                this.processWrite(writev, chunk, encoding, callback);
            })
            return;
        }
        if (this.destroyed) return;
        if (!this.headersSent) {
            this.proceed()
        }

        let waitingForWriteCallback = true;
        let waitingForEndCheck = true;
        let writeCallbackErr: Error | null | undefined;
        let endCheckCallbackErr: Error | null | undefined;
        const done = () => {
            if (waitingForEndCheck || waitingForWriteCallback) return;

            if (endCheckCallbackErr && writeCallbackErr && endCheckCallbackErr !== writeCallbackErr) {
                const err = new TransportExecption(
                    writeCallbackErr?.message ?? endCheckCallbackErr?.message,
                    (writeCallbackErr as Execption)?.code
                );
                this.destroy(err);
            }
            callback();

        };
        const writeCallback = (err?: Error | null) => {
            waitingForWriteCallback = false;
            writeCallbackErr = err;
            done();
        };
        const endCheckCallback = (err?: Error) => {
            waitingForEndCheck = false;
            endCheckCallbackErr = err;
            done();
        };

        // Shutdown write stream right after last chunk is sent
        // so final DATA frame can include END_STREAM flag
        process.nextTick(() => {
            if (writeCallbackErr ||
                !this._writableState.ending ||
                (this._writableState.buffer?.length || (this._writableState as any)['buffered']?.length) ||
                (this.state.flags & StreamStateFlags.trailers))
                return endCheckCallback();
            this.shutdownWritable(endCheckCallback);
        });

        chunk = this.attachStreamId(chunk, encoding);
        // let req: any;
        if (writev)
            this.connection.write(chunk, writeCallback);
        else
            this.connection.write(chunk, encoding, writeCallback);

        // this.trackWriteState(req.bytes);
    }

    attachStreamId(chunk: any, encoding?: BufferEncoding) {
        const streamId = this.streamId!;
        if (isString(chunk)) {
            const buffer = Buffer.from(chunk, encoding);
            return Buffer.concat([streamId, buffer], streamId.length + buffer.length);
        }
        if (isBuffer(chunk)) {
            return Buffer.concat([streamId, chunk], streamId.length + chunk.length);
        }

        chunk.id = this.id;
        return chunk;
    }


    protected abstract proceed(): void;

    /**
     * Closes the `TransportStream` instance by sending an `RST_STREAM` frame to the
     * connected transport peer.
     * @since v8.4.0
     * @param [code] Unsigned 32-bit integer identifying the error code.
     * @param callback An optional function registered to listen for the `'close'` event.
     */
    close(code?: number, callback?: () => void): void {
        if (this.isClosed) {
            if (!(this.state.flags & StreamStateFlags.closed)) {
                this.state.flags |= StreamStateFlags.closed;
            }
            return;
        }

        callback && this.once(ev.CLOSE, callback);
        this.closeStream(code);
    }

    override _destroy(error: Error | null, callback: (error: Error | null) => void): void {
        const cstate = this.connection.state;
        const ccode = cstate.goawayCode ?? cstate.destroyCode ?? 0;
        const code = error != null ? ccode ?? 0 : (this.isClosed ? this.rstCode : ccode);
        if (!this.isClosed) {
            this.closeStream(code, StreamRstStatus.force);
        }
        this.push(null);

        this.id && cstate.streams.delete(this.id);
        cstate.pendingStreams.delete(this);


        // Adjust the write queue size for accounting
        cstate.writeQueueSize -= this.state.writeQueueSize;
        this.state.writeQueueSize = 0;
        this.connection.mayBeDestroy();
        callback(error);
    }

    setTimeout(msecs: number, callback?: () => void) {
        if (this.destroyed)
            return this;


        // Attempt to clear an existing timer in both cases -
        //  even if it will be rescheduled we don't want to leak an existing timer.
        this._timeout && clearTimeout(this._timeout);

        if (msecs === 0) {
            if (callback !== undefined) {
                this.removeListener(ev.TIMEOUT, callback);
            }
        } else {
            this._timeout = setTimeout(this._onTimeout.bind(this), msecs);
            if (this.connection) this.connection._updateTimer();

            if (callback !== undefined) {
                this.once(ev.TIMEOUT, callback);
            }
        }
        return this;
    }

    protected closeStream(code?: number, status: StreamRstStatus = StreamRstStatus.submit) {
        this.state.flags |= StreamStateFlags.closed;
        this.state.rstCode = code!;
        this.setTimeout(0);
        this.removeAllListeners(ev.TIMEOUT);

        if (this.ending) {
            if (this.aborted) {
                this.state.flags |= StreamStateFlags.aborted;
                this.emit(ev.ABORTED);
            }

            this.end();
        }

        if (status !== StreamRstStatus.none) {
            const finishFn = () => {
                if (this.pending) {
                    this.push(null);
                    this.once(ev.READY, () => this.submitRstStream(code))
                    return;
                }
                this.submitRstStream(code)
            }

            if (!this.ending || this.writableFinished || code !== STRESM_NO_ERROR ||
                status === StreamRstStatus.force) {
                finishFn();
            } else {
                this.once(ev.FINISH, finishFn);
            }
        }

    }

    protected submitRstStream(code?: number) {

    }

    protected shutdownWritable(callback: (error?: Error) => void) {
        const state = this.state;
        if (state.shutdownWritableCalled) {
            return callback();
        }
        state.shutdownWritableCalled = true;
    }

    protected streamOnResume(size?: number) {
        if (!this.destroyed) {
            this.resume();
        }
    }

    protected _onTimeout() {
        if (this.destroyed) return;
        this.emit(ev.TIMEOUT);
    }

    _updateTimer() {
        if (this.destroyed) return;
        if (this._timeout && isFunction(this._timeout.refresh)) this._timeout.refresh()
    }

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
    addListener(event: string | symbol, listener: (...args: any[]) => void): this;
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
    emit(event: string | symbol, ...args: any[]): boolean;
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
    on(event: string | symbol, listener: (...args: any[]) => void): this;
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
    once(event: string | symbol, listener: (...args: any[]) => void): this;
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
    prependListener(event: string | symbol, listener: (...args: any[]) => void): this;
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
    prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this;
    prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this {
        return this._prependOnceListener(event, listener);
    }
    protected _prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this {
        return super.prependOnceListener(event, listener);
    }
}
