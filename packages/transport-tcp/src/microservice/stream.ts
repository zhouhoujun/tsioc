import { ServerStream, ServerStreamFactory, ServerStreamOpts, IncomingHeaders, PacketTransformer } from '@tsdi/core';
import { Execption, Injectable } from '@tsdi/ioc';
import { ev } from '@tsdi/transport';
import { Duplexify } from '@tsdi/platform-server-transport';
import { Writable, Duplex, Transform } from 'stream';
import { NumberAllocator } from 'number-allocator';

@Injectable()
export class ServerStreamFactoryImpl<TSocket extends Duplex = any> implements ServerStreamFactory<TSocket> {

    allocator = new NumberAllocator(1, 65536);
    last?: number;

    constructor(private transformer: PacketTransformer) {

    }

    create(socket: TSocket, opts: ServerStreamOpts): ServerStream<TSocket> {
        const transformer = opts.transformer ?? this.transformer;
        return new ServerStreamImpl(opts.id ?? this.getStreamId(), socket, opts.headers, transformer.createGenerator(socket, opts), transformer.createParser(opts));
    }

    getStreamId() {
        const id = this.allocator.alloc();
        if (!id) {
            throw new Execption('alloc stream id failed');
        }
        this.last = id;
        return id;
    }

}

export class ServerStreamImpl<TSocket extends Duplex = any> extends Duplexify implements ServerStream<TSocket> {

    constructor(readonly id: number, readonly socket: TSocket, readonly headers: IncomingHeaders | undefined, private generator: Writable, private parser: Transform) {
        super(generator, parser, { objectMode: true });

        process.nextTick(() => {
            this.generator.pipe(this.socket)
            this.socket.pipe(this.parser);
        });

        [ev.CLOSE, ev.ERROR].forEach(n => {
            const evt = this.emit.bind(this, n);
            this.socket.on(n, evt);
            if (n === ev.ERROR) {
                this.generator.on(n, evt);
                this.parser.on(n, evt);
            }
        })

    }

    protected override _writing(chunk: any, encoding: BufferEncoding, cb: (error?: Error | null | undefined) => void): void {
        if (!this.headerSent && this.headers) {
            super._writing(this.headers, encoding, cb);
            this._headerSent = true;
        }
        super._writing(chunk, encoding, cb);
    }

    private _headerSent = false;
    get headerSent(): boolean {
        return this._headerSent;
    }

}


