import { Abstract, EMPTY_OBJ } from '@tsdi/ioc';
import * as Duplexify from 'duplexify';
import { Writable, Duplex, DuplexOptions, Transform } from 'stream';
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

        this._generator.on('error', this.emit.bind(this, 'error'))
        this._parser.on('error', this.emit.bind(this, 'error'))

        this.stream.on('error', this.emit.bind(this, 'error'));
        this.stream.on('close', this.emit.bind(this, 'close'));
    }

    /**
     * Will be `true` if this `Connection` instance has been closed, otherwise`false`.
     */
    abstract readonly closed: boolean;
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
