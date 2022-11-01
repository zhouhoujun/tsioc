import { TransportExecption } from '@tsdi/core';
import { Abstract, ArgumentExecption, EMPTY, EMPTY_OBJ, isFunction, lang } from '@tsdi/ioc';
import { EventEmitter } from 'events';
import { Writable, Duplex, Transform } from 'stream';
import { Duplexify, DuplexifyOptions } from './duplexify';
import { ev } from './consts';

/**
 * connection options.
 */
export interface ConnectionOpts extends DuplexifyOptions, Record<string, any> {
    /**
     * parse socket to duplex socket.
     * @param socket 
     */
    parseToDuplex?(socket: EventEmitter): Duplex;
    /**
     * custom set Keep alive.
     * @param enable 
     * @param initialDelay 
     */
    setKeepAlive?(enable?: boolean, initialDelay?: number): void;
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
export abstract class Connection<TSocket extends EventEmitter = EventEmitter> extends Duplexify {

    /**
     * socket.
     */
    abstract get socket(): TSocket;
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
 * Duplex Connection.
 */
export class DuplexConnection<TSocket extends EventEmitter = EventEmitter> extends Connection<TSocket> {
    private _timeout?: any;
    protected _parser: PacketParser;
    protected _generator: PacketGenerator;
    protected _regevs: Record<string, (...args: any[]) => void>;
    protected opts: ConnectionOpts;
    protected _duplex: Duplex;
    constructor(readonly socket: TSocket, readonly packet: PacketFactory, opts: ConnectionOpts = EMPTY_OBJ) {
        super(null, null, opts = { ...opts, objectMode: true });
        this.opts = opts;
        if (socket instanceof Duplex) {
            this._duplex = socket;
        } else if (opts.parseToDuplex) {
            this._duplex = opts.parseToDuplex(socket);
        } else {
            throw new ArgumentExecption('can not parse socket to duplex, missing parseToDuplex in ConnectionOpts')
        }
        this._parser = packet.createParser(opts);
        this._generator = packet.createGenerator(this._duplex, opts);
        this.setReadable(this._parser);
        this.setWritable(this._generator);

        process.nextTick(() => {
            this._duplex.pipe(this._parser);
        });

        this._regevs = {};

        [...(opts.events || EMPTY), ...evets].forEach(n => {
            const evt = this.emit.bind(this, n);
            this._regevs[n] = evt;
            this._duplex.on(n, evt);
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
        if (this.opts.setKeepAlive) {
            this.opts.setKeepAlive(enable, initialDelay);
        } else if (isFunction((this.socket as any).setKeepAlive)) {
            (this.socket as any).setKeepAlive(enable, initialDelay);
        }
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
            this._duplex.off(n, e);
            this._parser.off(n, e);
            this._generator.off(n, e);
        });
        if (this._duplex.destroy) {
            this._duplex.destroy(error ?? undefined);
            callback && callback();
        } else {
            this._duplex.end(callback);
        }
        return super.destroy(error, callback);
    }

}


export class TransportStreamCancel extends TransportExecption {
    constructor(message?: string | Error) {
        super(message instanceof Error ? message.message : message)
    }
}

