import { Abstract, EMPTY_OBJ } from '@tsdi/ioc';
import * as Duplexify from 'duplexify';
import { Writable, Duplex, DuplexOptions, Transform } from 'stream';
import { ev } from './consts';
import { PacketParser } from './packet';



export interface ConnectionOpts extends DuplexOptions, Record<string, any> {

}



@Abstract()
export abstract class Connection extends Duplexify {

    protected _parser: Transform;
    protected _generator: Writable;
    constructor(private stream: Duplex, readonly packetParser: PacketParser, private opts: ConnectionOpts = EMPTY_OBJ) {
        super(undefined, undefined, opts);

        this._parser = packetParser.parser(opts);
        this._generator = packetParser.generate(stream, opts);
        this.setWritable(this._generator);
        this.setReadable(this._parser);

        this.bindEvents(opts);
    }

    protected bindEvents(opts?: ConnectionOpts) {
        process.nextTick(() => {
            this.stream.pipe(this._parser);
        });

        this.once(ev.CLOSE, () => {
            this.closed = true
        })

        this._generator.on(ev.ERROR, this.emit.bind(this, ev.ERROR))
        this._parser.on(ev.ERROR, this.emit.bind(this, ev.ERROR))

        this.stream.on(ev.ERROR, this.emit.bind(this, ev.ERROR));
        this.stream.on(ev.CLOSE, this.emit.bind(this, ev.CLOSE));
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
