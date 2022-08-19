import { Abstract, isFunction } from '@tsdi/ioc';
import { IncomingHeaders, OutgoingHeaders } from '@tsdi/core';
import { Duplex, DuplexOptions, Transform, Readable, TransformCallback } from 'stream';
import { Connection } from './connection';
import { ev } from './consts';
import { setTimeout } from 'timers';
import { PacketProtocol } from './packet';
import { isBuffer } from './utils';

/**
 * transport stream
 */
@Abstract()
export abstract class TransportStream extends Duplex {

    private _timeout?: any;
    readonly streamId: Buffer;
    headerSent = false;
    constructor(readonly connection: Connection, streamId: string, private headers: OutgoingHeaders, opts?: DuplexOptions) {
        super(opts);
        this.streamId = Buffer.from(streamId);
        this.bindEvents(opts);
    }

    protected bindEvents(opts?: DuplexOptions) {
        this.connection.on('error', this.emit.bind(this, 'error'));
        this.connection.on('close', this.emit.bind(this, 'close'));
        const steam = new BodyTransform(this.connection.packet, this.streamId);
        process.nextTick(() => {
            this.connection
                .pipe(steam)
                .pipe(this);
        });
    }

    override _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
        if(this.headerSent) {
            this.connection.stream.write(this.streamId);
            this.connection.write(chunk, encoding, callback);
            return;
        }
        this.connection.write(this.connection.packet.attachStreamId(chunk, this.streamId))
    }

    /**
     * Closes the `TransportStream` instance by sending an `RST_STREAM` frame to the
     * connected transport peer.
     * @since v8.4.0
     * @param [code] Unsigned 32-bit integer identifying the error code.
     * @param callback An optional function registered to listen for the `'close'` event.
     */
    close(code?: number, callback?: () => void): void {
        this.emit(ev.CLOSE, code);
        callback && setImmediate(callback);
    }

    setTimeout(msecs: number, callback?: () => void) {
        if (this.destroyed)
            return this;


        // Attempt to clear an existing timer in both cases -
        //  even if it will be rescheduled we don't want to leak an existing timer.
        this._timeout && clearTimeout(this._timeout);

        if (msecs === 0) {
            if (callback !== undefined) {
                this.removeListener('timeout', callback);
            }
        } else {
            this._timeout = setTimeout(this._onTimeout.bind(this), msecs);
            if (this.connection) this.connection._updateTimer();

            if (callback !== undefined) {
                this.once('timeout', callback);
            }
        }
        return this;
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



export class BodyTransform extends Transform {

    constructor(private packet: PacketProtocol, private streamId: Buffer) {
        super();
    }

    override _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback): void {
        if (isBuffer(chunk) && this.packet.isBody(chunk, this.streamId)) {
            callback(null, this.packet.parseBody(chunk, this.streamId));
        }
    }
}