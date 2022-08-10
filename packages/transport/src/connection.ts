import { Abstract, EMPTY_OBJ } from '@tsdi/ioc';
import { Duplex, Transform, DuplexOptions, TransformCallback } from 'stream';
import { PacketBuilder, PacketParser } from './packet';


@Abstract()
export abstract class Connection extends Transform {

    protected parser: PacketParser;
    constructor(private stream: Duplex, readonly builder: PacketBuilder, private opts: DuplexOptions = EMPTY_OBJ) {
        super(opts);
        this.parser = builder.build(opts);
        this.bindEvents(opts);
    }

    protected bindEvents(opts?: DuplexOptions) {
        process.nextTick(() => {
            this.stream.pipe(this);
        });

        this.stream.on('error', this.emit.bind(this, 'error'));
        this.stream.on('close', this.emit.bind(this, 'close'));
    }

    override _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback): void {
        this.parser.parse(chunk, (packet) => {
            this.push(packet, encoding);
            callback();
        });
    }


    override _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
        this.stream.write(this.parser.generate(chunk, this.opts), encoding, callback);
    }

    /**
     * Gracefully closes the `TransportSession`, allowing any existing streams to
     * complete on their own and preventing new `TransportSession` instances from being
     * created. Once closed, `TransportSession.destroy()`_might_ be called if there
     * are no open `TransportSession` instances.
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
