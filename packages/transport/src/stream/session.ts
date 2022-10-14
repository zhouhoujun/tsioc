import { TransportExecption } from '@tsdi/core';
import { EMPTY_OBJ, isFunction, lang } from '@tsdi/ioc';
import { EventEmitter } from 'events';
import { Duplex } from 'stream';
import { ev } from '../consts';
import { InvalidSessionExecption } from '../execptions';
import { TransportStream } from './stream';


/**
 * connection options.
 */
export interface SessionOpts {
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
    destroyCode?: number | null;
    goawayCode?: number | null
}

/**
 * Connection state flags.
 */
export enum ConnectionStateFlags {
    pending = 0x0,
    ready = 0x1,
    closed = 0x2,
    destroyed = 0x4
}

/**
 * Connection state.
 */
export interface ConnectionState extends Record<string, any> {
    destroyCode: number | null;
    flags: ConnectionStateFlags;
    goawayCode: number | null
    goawayLastStreamID: number | null
    streams: Map<number, TransportStream>;
    pendingStreams: Set<TransportStream>;
    pendingAck: number;
    shutdownWritableCalled: boolean,
    writeQueueSize: number,
    originSet?: string;
}

const NO_ERROR = 0;



export interface Closeable {
    readonly closed?: boolean;
    close(...args: any[]): void;
}

const evets = [ev.CLOSE, ev.ERROR];

export abstract class Session extends EventEmitter implements Closeable {
    private _timeout?: any;
    protected _regevs: Record<string, (...args: any[]) => void>;
    readonly state: ConnectionState;
    protected opts: SessionOpts;
    constructor(readonly duplex: Duplex, opts: SessionOpts = EMPTY_OBJ) {
        super();
        this.opts = opts;
        this.state = {
            destroyCode: opts.noError ?? NO_ERROR,
            flags: ConnectionStateFlags.ready,
            goawayCode: opts.goawayCode ?? null,
            goawayLastStreamID: null,
            streams: new Map(),
            pendingStreams: new Set(),
            pendingAck: 0,
            shutdownWritableCalled: false,
            writeQueueSize: 0
        };

        this._regevs = {};
        evets.forEach(n => {
            const evt = this.emit.bind(this, n);
            this.duplex.on(n, evt);
            this._regevs[n] = evt;
        });
    }

    /**
     * Will be `true` if this `Connection` instance has been closed, otherwise`false`.
     */
    get closed(): boolean {
        return !!(this.state.flags & ConnectionStateFlags.closed);
    }

    get connecting() {
        return (this.state.flags & ConnectionStateFlags.ready) === 0;
    }

    get destroyed() {
        return (this.state.flags & ConnectionStateFlags.destroyed) === 0
    }

    abstract getNextStreamId(id?: number): number;
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
        (this.duplex as any).setKeepAlive?.(enable, initialDelay);
        return this;
    }

    /**
     * Gracefully closes the `Connection`, allowing any existing streams to
     * complete on their own and preventing new `Connection` instances from being
     * created. Once closed, `Connection.destroy()`_might_ be called if there
     * are no open `Connection` instances.
     *
     * If specified, the `callback` function is registered as a handler for the`'close'` event.
     */
    close(callback?: () => void): void {
        if (this.closed || this.destroyed) {
            return;
        }

        this.state.flags |= ConnectionStateFlags.closed;
        if (isFunction(callback)) {
            this.once(ev.CLOSE, callback);
        }
        this.goaway();
        this.mayBeDestroy()
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

    mayBeDestroy(err?: Error) {
        if (!err) {
            if (this.closed || this.state.streams.size > 0 || this.state.pendingStreams.size > 0) return;
        }
        this.destroy(err);
    }

    destroy(error?: Error): this;
    destroy(error?: Error, code?: number): this {
        if (this.destroyed) return this;
        this.closeSession(code, error);
        return this;
    }

    protected closeSession(code = 0, error?: Error) {
        const state = this.state;
        state.flags |= ConnectionStateFlags.destroyed;
        state.destroyCode = code;
        // Clear timeout and remove timeout listeners.
        this.setTimeout(0);
        this.removeAllListeners(ev.TIMEOUT);

        lang.forIn(this._regevs, (e, n) => {
            this.duplex.off(n, e);
            this._regevs[n] = null!
        });


        // Destroy any pending and open streams
        if (state.pendingStreams.size > 0 || state.streams.size > 0) {
            const cancel = new TransportStreamCancel(error);
            state.pendingStreams.forEach((stream) => stream.destroy(cancel));
            state.streams.forEach((stream) => stream.destroy(error));
        }

        if (!this.duplex.destroyed) {
            this.duplex.end(() => {
                this.duplex.destroy(error);
            })
        } else {
            process.nextTick(() => this.duplex.destroy(error));
        }

    }


    protected _onTimeout() {
        if (this.destroyed) return;
        this.emit(ev.TIMEOUT);
    }

    protected goaway(code = 0, lastStreamID = 0, opaqueData?: Buffer) {
        if (this.destroyed) throw new InvalidSessionExecption()

        const goawayFn = () => {
            if (this.destroyed) return;
            this._updateTimer();
            this.emit(ev.GOAWAY, code, lastStreamID, opaqueData);
        };
        if (this.connecting) {
            this.once(ev.CONNECT, goawayFn);
            return;
        }
        goawayFn();
    }

    protected _addListener(event: string | symbol, listener: (...args: any[]) => void): this {
        return super.addListener(event, listener);
    }

    protected _emit(event: string | symbol, ...args: any[]): boolean {
        return super.emit(event, ...args);
    }

    protected _on(event: string | symbol, listener: (...args: any[]) => void): this {
        return super.on(event, listener);
    }

    protected _once(event: string | symbol, listener: (...args: any[]) => void): this {
        return super.once(event, listener);
    }

    protected _prependListener(event: string | symbol, listener: (...args: any[]) => void): this {
        return super.prependListener(event, listener);
    }

    protected _prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this {
        return super.prependOnceListener(event, listener);
    }


}


export class TransportStreamCancel extends TransportExecption {
    constructor(message?: string | Error) {
        super(message instanceof Error ? message.message : message)
    }
}

