import { Abstract, EMPTY_OBJ, isFunction } from '@tsdi/ioc';
import * as Duplexify from 'duplexify';
import { Readable, Writable, Duplex, DuplexOptions, Transform } from 'stream';
import { ev } from './consts';
import { PacketProtocol } from './packet';


/**
 * connection options.
 */
export interface ConnectionOpts extends DuplexOptions, Record<string, any> {
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
export abstract class Connection extends Duplexify {
    private _timeout?: any;
    protected _parser: Transform;
    protected _generator: Writable;
    constructor(readonly duplex: Duplex, readonly packet: PacketProtocol, private opts: ConnectionOpts = EMPTY_OBJ) {
        super(undefined, undefined, opts);

        this._parser = packet.transform(opts);
        this._generator = packet.generate(duplex, opts);
        this.setWritable(this.writePipe(this._generator));
        this.setReadable(this.readPipe(this._parser));

        this.bindEvents(opts);
    }

    get options() {
        return this.opts;
    }

    protected readPipe(parser: Transform): Readable {
        return parser;
    }

    protected writePipe(writable: Writable): Writable {
        return writable;
    }

    protected bindEvents(opts: ConnectionOpts) {
        process.nextTick(() => {
            this.duplex.pipe(this._parser);
        });

        this.once(ev.CLOSE, () => {
            this.closed = true
        });

        this._generator.on(ev.ERROR, this.emit.bind(this, ev.ERROR))
        this._parser.on(ev.ERROR, this.emit.bind(this, ev.ERROR))

        this.duplex.on(ev.ERROR, this.emit.bind(this, ev.ERROR));
        this.duplex.on(ev.CLOSE, this.emit.bind(this, ev.CLOSE));
    }

    /**
     * Will be `true` if this `Connection` instance has been closed, otherwise`false`.
     */
    closed = false;

    /**
     * Gracefully closes the `Connection`, allowing any existing streams to
     * complete on their own and preventing new `Connection` instances from being
     * created. Once closed, `Connection.destroy()`_might_ be called if there
     * are no open `Connection` instances.
     *
     * If specified, the `callback` function is registered as a handler for the`'close'` event.
     */
    abstract close(): Promise<void>;

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
