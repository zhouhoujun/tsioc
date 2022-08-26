import { Abstract, EMPTY_OBJ, isFunction } from '@tsdi/ioc';
import * as Duplexify from 'duplexify';
import { Readable, Writable, Duplex, DuplexOptions, Transform } from 'stream';
import { ev } from './consts';
import { InvalidSessionExecption } from './execptions';
import { Closeable, PacketProtocol } from './packet';
import { TransportStream } from './stream';


/**
 * connection options.
 */
export interface ConnectionOpts extends DuplexOptions, Record<string, any> {
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

@Abstract()
export abstract class Connection extends Duplexify implements Closeable {
    private _timeout?: any;
    protected _parser: Transform;
    protected _generator: Writable;

    readonly state: ConnectionState;
    constructor(readonly stream: Duplex, readonly packet: PacketProtocol, private opts: ConnectionOpts = EMPTY_OBJ) {
        super(undefined, undefined, opts);
        this.state = {
            destroyCode: opts.noError ?? NO_ERROR,
            flags: ConnectionStateFlags.pending,
            goawayCode: null,
            goawayLastStreamID: null,
            streams: new Map(),
            pendingStreams: new Set(),
            pendingAck: 0,
            shutdownWritableCalled: false,
            writeQueueSize: 0
        };

        this._parser = packet.transform(opts);
        this._generator = packet.generate(stream, opts);
        this.setWritable(this.writePipe(this._generator));
        this.setReadable(this.readPipe(this._parser));

        process.nextTick(() => {
            this.stream.pipe(this._parser);
        });

        this.once(ev.CLOSE, () => this.close());

        this._generator.on(ev.ERROR, this.emit.bind(this, ev.ERROR))
        this._parser.on(ev.ERROR, this.emit.bind(this, ev.ERROR))

        this.stream.on(ev.ERROR, this.emit.bind(this, ev.ERROR));
        this.stream.on(ev.CLOSE, this.emit.bind(this, ev.CLOSE));

        this.stream.on(ev.CONNECT, () => {
            this.state.flags |= ConnectionStateFlags.ready;
            this.emit(ev.READY);
        })
    }

    get options() {
        return this.opts;
    }

    /**
     * Will be `true` if this `Connection` instance has been closed, otherwise`false`.
     */
    get isClosed(): boolean {
        return (this as Closeable).closed === true || !!(this.state.flags & ConnectionStateFlags.closed);
    }

    get connecting() {
        return (this.state.flags & ConnectionStateFlags.ready) === 0;
    }

    /**
     * get packet next id.
     */
    abstract getNextStreamId(id?: number): number;

    /**
     * Gracefully closes the `Connection`, allowing any existing streams to
     * complete on their own and preventing new `Connection` instances from being
     * created. Once closed, `Connection.destroy()`_might_ be called if there
     * are no open `Connection` instances.
     *
     * If specified, the `callback` function is registered as a handler for the`'close'` event.
     */
    close(callback?: () => void): void {
        if (this.isClosed || this.destroyed) {
            if (!(this.state.flags & ConnectionStateFlags.closed)) {
                this.state.flags |= ConnectionStateFlags.closed;
            }
            return;
        }

        this.state.flags |= ConnectionStateFlags.closed;
        if (callback) {
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
            if (this.isClosed || this.state.streams.size > 0 || this.state.pendingStreams.size > 0) return;
        }
        this.destroy(err);
    }

    override destroy(error?: Error | undefined): this {
        if (this.stream.destroy) {
            this.stream.destroy(error)
        } else {
            this.stream.end();
        }
        return super.destroy(error);
    }


    protected readPipe(parser: Transform): Readable {
        return parser;
    }

    protected writePipe(writable: Writable): Writable {
        return writable;
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
