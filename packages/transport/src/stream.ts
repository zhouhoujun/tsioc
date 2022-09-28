import { Abstract, isFunction } from '@tsdi/ioc';
import { IncomingHeaders, OutgoingHeaders } from '@tsdi/core';
import { Buffer } from 'buffer';
import { Readable, Writable, Transform } from 'stream';
import { Connection } from './connection';
import { ev } from './consts';
import { setTimeout } from 'timers';
import { Closeable } from './strategy';
import { Duplexify, DuplexifyOptions } from './duplexify';



/**
* connection options.
*/
export interface SteamOptions extends DuplexifyOptions, Record<string, any> {
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
    /**
     * rst stream
     */
    rstStream?: (code: number) => void;
    /**
     * is client or not.
     */
    client?: boolean;
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

const evts = [ev.ABORTED, ev.TIMEOUT, ev.ERROR, ev.CLOSE];


@Abstract()
export abstract class StreamParser extends Transform {
    abstract setOptions(opts: SteamOptions): void;
}

@Abstract()
export abstract class StreamGenerator extends Writable {
    abstract setOptions(opts: SteamOptions): void;
}

/**
 * transport stream
 */
@Abstract()
export abstract class TransportStream extends Duplexify implements Closeable {

    private _timeout?: any;
    protected _id?: number;
    protected ending?: boolean;
    protected didRead = false;
    protected stats = StreamStateFlags.pending;
    protected _rstCode?: number;
    protected _sentHeaders?: OutgoingHeaders;
    protected _sentTrailers?: any;
    protected _infoHeaders?: any;
    private _regevs?: Map<string, any>;
    protected opts: SteamOptions;
    private _parser?: Transform;
    private _generator?: Writable;
    constructor(readonly connection: Connection, opts: SteamOptions) {
        super(null, null, opts = { ...opts, objectMode: true, allowHalfOpen: true, autoDestroy: false, decodeStrings: false });
        this.opts = opts;

        this.cork();
        // Allow our logic for determining whether any reads have happened to
        // work in all situations. This is similar to what we do in _http_incoming.
        this._readableState.readingMore = true;

        this.connection.state.pendingStreams.add(this);

    }

    get id() {
        return this._id;
    }

    get isClosed() {
        return (this as Closeable).closed === true || !!(this.stats & StreamStateFlags.closed);
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
        return !!(this.stats & StreamStateFlags.headersSent);
    }

    /**
     *  True if the Stream was aborted abnormally.
     */
    get aborted() {
        return !!(this.stats & StreamStateFlags.aborted);
    }

    // True if dealing with a HEAD request
    get headRequest() {
        return !!(this.stats & StreamStateFlags.headRequest);
    }

    // The error code reported when this Http2Stream was closed.
    get rstCode() {
        return this._rstCode;
    }

    init(id: number) {
        if (this.id !== undefined) return;
        const connection = this.connection;
        this.stats |= StreamStateFlags.ready;

        connection.state.pendingStreams.delete(this);
        connection.state.streams.set(id, this);
        this._id = id;

        this.uncork();
        const tsp = connection.packetor;
        const parser = this._parser = tsp.streamParser(this, this.opts);
        const generator = this._generator = tsp.streamGenerator(connection, id, this.opts);
        this.setReadable(parser);
        this.setWritable(generator);
        process.nextTick(() => {
            connection.pipe(parser);
        });

        this._regevs = new Map(evts.map(evt => [evt, this.emit.bind(this, evt)]));
        this._regevs.forEach((evt, n) => {
            this.connection.on(n, evt);
            if (n === ev.ERROR) {
                generator.on(n, evt);
                parser.on(n, evt);
            }
        });

        this.emit(ev.READY)
    }

    override _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
        if (!this.destroyed && !this.headersSent) {
            this.proceed()
        }
        super._write(chunk, encoding, callback);
    }

    override _read(size: number): void {
        if (this.destroyed) {
            this.push(null);
            return;
        }
        if (!this.didRead) {
            this._readableState.readingMore = false;
            this.didRead = true;
        }
        super._read(size);
    }

    protected abstract proceed(): void;


    override _ending(chunk?: any, encoding?: BufferEncoding | undefined, cb?: (() => void) | undefined): void {
        if (!this.headersSent) {
            this.proceed();
        }
        super._ending(chunk, encoding, cb);
    }

    /**
     * Closes the `TransportStream` instance by sending an `RST_STREAM` frame to the
     * connected transport peer.
     * @since v8.4.0
     * @param [code] Unsigned 32-bit integer identifying the error code.
     * @param callback An optional function registered to listen for the `'close'` event.
     */
    close(code?: number, callback?: () => void): void {
        if (this.isClosed) {
            if (!(this.stats & StreamStateFlags.closed)) {
                this.stats |= StreamStateFlags.closed;
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
        if (this._regevs) {
            this._regevs.forEach((e, n) => {
                this.connection.off(n, e);
                this._parser?.off(n, e);
                this._generator?.off(n, e);
            });
            this._regevs.clear();
        }

        this.connection.mayBeDestroy();
        return super._destroy(error ?? null, callback);
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

    protected closeStream(code = STRESM_NO_ERROR, status: StreamRstStatus = StreamRstStatus.submit) {
        this.stats |= StreamStateFlags.closed;
        this._rstCode = code!;
        this.setTimeout(0);
        this.removeAllListeners(ev.TIMEOUT);

        if (!this.ending) {
            if (this.aborted) {
                this.stats |= StreamStateFlags.aborted;
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

    protected submitRstStream(code: number) {
        this.opts.rstStream?.(code);
    }

    protected streamOnResume(size?: number) {
        if (!this.destroyed) {
            this.resume();
            super._read(size!);
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
