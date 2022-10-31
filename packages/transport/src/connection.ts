import { TransportExecption } from '@tsdi/core';
import { Abstract, EMPTY, EMPTY_OBJ, isFunction, lang } from '@tsdi/ioc';
import { EventEmitter } from 'events';
import { Writable, Duplex, Transform } from 'stream';
import { Duplexify, DuplexifyOptions } from './duplexify';
import { ev } from './consts';
import { Observer } from 'rxjs';

/**
 * connection options.
 */
export interface ConnectionOpts extends DuplexifyOptions, Record<string, any> {
    /**
     * connect event name
     */
    connect?: string;
    noData?: boolean;
    noError?: number;
    events?: string[];
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
}


@Abstract()
export abstract class Connection extends EventEmitter {

    /**
     * socket.
     */
    abstract get socket(): EventEmitter;
    /**
     * Enable/disable keep-alive functionality, and optionally set the initial
     * delay before the first keepalive probe is sent on an idle socket.
     *
     * Set `initialDelay` (in milliseconds) to set the delay between the last
     * data packet received and the first keepalive probe. Setting `0` for`initialDelay` will leave the value unchanged from the default
     * (or previous) setting.
     *
     * Enabling the keep-alive functionality will set the following socket options:
     *
     * * `SO_KEEPALIVE=1`
     * * `TCP_KEEPIDLE=initialDelay`
     * * `TCP_KEEPCNT=10`
     * * `TCP_KEEPINTVL=1`
     * @since v0.1.92
     * @param [enable=false]
     * @param [initialDelay=0]
     * @return The socket itself.
     */
    abstract setKeepAlive(enable?: boolean, initialDelay?: number): this;
    /**
     * setTimeout
     * @param msecs 
     * @param callback 
     */
    abstract setTimeout(msecs: number, callback?: () => void): this;

    /**
     * is closed or not.
     */
    abstract get isClosed(): boolean;

    /**
     * destoryed or not.
     */
    abstract get destroyed(): boolean;
    /**
     * The `writable.write()` method writes some data to the stream, and calls the
     * supplied `callback` once the data has been fully handled. If an error
     * occurs, the `callback` will be called with the error as its
     * first argument. The `callback` is called asynchronously and before `'error'` is
     * emitted.
     *
     * The return value is `true` if the internal buffer is less than the`highWaterMark` configured when the stream was created after admitting `chunk`.
     * If `false` is returned, further attempts to write data to the stream should
     * stop until the `'drain'` event is emitted.
     *
     * While a stream is not draining, calls to `write()` will buffer `chunk`, and
     * return false. Once all currently buffered chunks are drained (accepted for
     * delivery by the operating system), the `'drain'` event will be emitted.
     * Once `write()` returns false, do not write more chunks
     * until the `'drain'` event is emitted. While calling `write()` on a stream that
     * is not draining is allowed, Node.js will buffer all written chunks until
     * maximum memory usage occurs, at which point it will abort unconditionally.
     * Even before it aborts, high memory usage will cause poor garbage collector
     * performance and high RSS (which is not typically released back to the system,
     * even after the memory is no longer required). Since TCP sockets may never
     * drain if the remote peer does not read the data, writing a socket that is
     * not draining may lead to a remotely exploitable vulnerability.
     *
     * Writing data while the stream is not draining is particularly
     * problematic for a `Transform`, because the `Transform` streams are paused
     * by default until they are piped or a `'data'` or `'readable'` event handler
     * is added.
     *
     * If the data to be written can be generated or fetched on demand, it is
     * recommended to encapsulate the logic into a `Readable` and use {@link pipe}. However, if calling `write()` is preferred, it is
     * possible to respect backpressure and avoid memory issues using the `'drain'` event:
     *
     * ```js
     * function write(data, cb) {
     *   if (!stream.write(data)) {
     *     stream.once('drain', cb);
     *   } else {
     *     process.nextTick(cb);
     *   }
     * }
     *
     * // Wait for cb to be called before doing any other write.
     * write('hello', () => {
     *   console.log('Write completed, do more writes now.');
     * });
     * ```
     *
     * A `Writable` stream in object mode will always ignore the `encoding` argument.
     * @since v0.9.4
     * @param chunk Optional data to write. For streams not operating in object mode, `chunk` must be a string, `Buffer` or `Uint8Array`. For object mode streams, `chunk` may be any
     * JavaScript value other than `null`.
     * @param [encoding='utf8'] The encoding, if `chunk` is a string.
     * @param callback Callback for when this chunk of data is flushed.
     * @return `false` if the stream wishes for the calling code to wait for the `'drain'` event to be emitted before continuing to write additional data; otherwise `true`.
     */
    abstract write(chunk: any, callback?: (error: Error | null | undefined) => void): boolean;
    abstract write(chunk: any, encoding: BufferEncoding, callback?: (error: Error | null | undefined) => void): boolean;
    /**
     * Calling the `writable.end()` method signals that no more data will be written
     * to the `Writable`. The optional `chunk` and `encoding` arguments allow one
     * final additional chunk of data to be written immediately before closing the
     * stream.
     *
     * Calling the {@link write} method after calling {@link end} will raise an error.
     *
     * ```js
     * // Write 'hello, ' and then end with 'world!'.
     * const fs = require('fs');
     * const file = fs.createWriteStream('example.txt');
     * file.write('hello, ');
     * file.end('world!');
     * // Writing more now is not allowed!
     * ```
     * @since v0.9.4
     * @param chunk Optional data to write. For streams not operating in object mode, `chunk` must be a string, `Buffer` or `Uint8Array`. For object mode streams, `chunk` may be any
     * JavaScript value other than `null`.
     * @param encoding The encoding if `chunk` is a string
     * @param callback Callback for when the stream is finished.
     */
    abstract end(cb?: () => void): this;
    abstract end(chunk: any, cb?: () => void): this;
    abstract end(chunk: any, encoding: BufferEncoding, cb?: () => void): this;
    abstract destroy(error?: Error | null, callback?: (err?: Error | null) => void): any;
}


/**
 * events maps.
 */
export interface Events extends Record<string, (...args: any[]) => void> {

}


@Abstract()
export abstract class PacketParser extends Transform {
    abstract setOptions(opts: ConnectionOpts): void;
}

@Abstract()
export abstract class PacketGenerator extends Writable {
    abstract setOptions(opts: ConnectionOpts): void;
}

@Abstract()
export abstract class PacketFactory {
    /**
     * create packet parser
     * @param opts options of type {@link ConnectionOpts}.
     */
    abstract createParser(opts: ConnectionOpts): PacketParser;
    /**
     * create packet generator
     * @param output the connection wirte output.
     * @param opts options of type {@link ConnectionOpts}.
     */
    abstract createGenerator(output: Writable, opts: ConnectionOpts): PacketGenerator;
}

const evets = [ev.CLOSE, ev.ERROR];


/**
 * Connection.
 */
export class TransportConnection extends Duplexify implements Connection {
    private _timeout?: any;
    protected _parser: PacketParser;
    protected _generator: PacketGenerator;
    protected _regevs: Record<string, (...args: any[]) => void>;
    protected opts: ConnectionOpts;
    constructor(readonly socket: Duplex, readonly packet: PacketFactory, opts: ConnectionOpts = EMPTY_OBJ) {
        super(null, null, opts = { ...opts, objectMode: true });
        this.opts = opts;

        this._parser = packet.createParser(opts);
        this._generator = packet.createGenerator(socket, opts);
        this.setReadable(this._parser);
        this.setWritable(this._generator);

        process.nextTick(() => {
            this.socket.pipe(this._parser);
        });

        this._regevs = {};

        [...(opts.events || EMPTY), ...evets].forEach(n => {
            const evt = this.emit.bind(this, n);
            this._regevs[n] = evt;
            this.socket.on(n, evt);
            if (n === ev.ERROR) {
                this._generator.on(n, evt);
                this._parser.on(n, evt);
            }

        });
    }


    /**
     * Enable/disable keep-alive functionality, and optionally set the initial
     * delay before the first keepalive probe is sent on an idle socket.
     *
     * Set `initialDelay` (in milliseconds) to set the delay between the last
     * data packet received and the first keepalive probe. Setting `0` for`initialDelay` will leave the value unchanged from the default
     * (or previous) setting.
     *
     * Enabling the keep-alive functionality will set the following socket options:
     *
     * * `SO_KEEPALIVE=1`
     * * `TCP_KEEPIDLE=initialDelay`
     * * `TCP_KEEPCNT=10`
     * * `TCP_KEEPINTVL=1`
     * @since v0.1.92
     * @param [enable=false]
     * @param [initialDelay=0]
     * @return The socket itself.
     */
    setKeepAlive(enable?: boolean, initialDelay?: number): this {
        (this.socket as any).setKeepAlive?.(enable, initialDelay);
        return this;
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
            if (callback !== undefined) {
                this.once(ev.TIMEOUT, callback);
            }
        }
        return this;
    }

    _updateTimer() {
        if (this.destroyed) return;
        if (this._timeout && isFunction(this._timeout.refresh)) this._timeout.refresh()
    }

    protected _onTimeout() {
        if (this.destroyed) return;
        this.emit(ev.TIMEOUT);
    }

    setOptions(packet: any, opts: ConnectionOpts) {
        const copts = this.opts = { ...packet, opts };
        this._parser.setOptions(copts);
        this._generator.setOptions(copts);
    }


    override destroy(error?: Error | null, callback?: (err?: Error | null) => void): this {
        if (this.destroyed) return this;
        lang.forIn(this._regevs, (e, n) => {
            this._regevs[n] = null!;
            this.socket.off(n, e);
            this._parser.off(n, e);
            this._generator.off(n, e);
        });
        if (this.socket.destroy) {
            this.socket.destroy(error ?? undefined);
            callback && callback();
        } else {
            this.socket.end(callback);
        }
        return super.destroy(error, callback);
    }

}


export class TransportStreamCancel extends TransportExecption {
    constructor(message?: string | Error) {
        super(message instanceof Error ? message.message : message)
    }
}

