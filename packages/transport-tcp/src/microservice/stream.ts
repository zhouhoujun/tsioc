import { ServerStream, ServerStreamFactory, StreamOpts, IncomingHeaders, InvalidJsonException } from '@tsdi/core';
import { Execption, Injectable } from '@tsdi/ioc';
import { PacketLengthException, ev } from '@tsdi/transport';
import { Duplexify } from '@tsdi/platform-server-transport';
import { Duplex } from 'stream';
import { NumberAllocator } from 'number-allocator';

@Injectable()
export class TcpServerStreamFactory<TSocket extends Duplex = any> implements ServerStreamFactory<TSocket> {

    allocator = new NumberAllocator(1, 65536);
    last?: number;

    constructor() {

    }

    create(socket: TSocket, opts: StreamOpts): ServerStream {
        return new ServerStreamImpl(opts.id ?? this.getStreamId(), socket, opts.headers, opts.delimiter);
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

export class ServerStreamImpl<TSocket extends Duplex = any> extends Duplexify implements ServerStream {

    private buffer = '';
    private contentLength: number | null = null;

    constructor(readonly id: number, readonly socket: TSocket, readonly headers: IncomingHeaders | undefined, private readonly delimiter = '#') {
        super(socket, socket, { objectMode: true });

        // process.nextTick(() => {
        //     this.generator.pipe(this.socket)
        //     this.socket.pipe(this.parser);
        // });

        // [ev.REQUEST, ev.MESSAGE].forEach(n => {
        //     const evt = this.emit.bind(this, n);
        //     this.parser.on(n, evt);
        // });

        [ev.CLOSE, ev.ERROR].forEach(n => {
            const evt = this.emit.bind(this, n);
            this.socket.on(n, evt);
        });

        this.socket.on(ev.DATA, this.onData.bind(this));
    }

    _write(chunk: any, encoding: BufferEncoding, cb: (error?: Error | null | undefined) => void): void {
        if (!this.headerSent && this.headers) {
            super._write(this.headers, encoding, cb);
            this._headerSent = true;
        }
        super._write(chunk, encoding, cb);
    }

    onData(chunk: any) {
        try {
            this.handleData(chunk);
        } catch (ev) {
            const e = ev as any;
            this.socket.emit(e.ERROR, e.message);
            this.socket.end();
        }
    }


    handleData(dataRaw: any) {
        const data = Buffer.isBuffer(dataRaw)
            ? new TextDecoder().decode(dataRaw)
            : dataRaw;
        this.buffer += data;

        if (this.contentLength == null) {
            const i = this.buffer.indexOf(this.delimiter);
            if (i !== -1) {
                const rawContentLength = this.buffer.substring(0, i);
                this.contentLength = parseInt(rawContentLength, 10);

                if (isNaN(this.contentLength)) {
                    this.contentLength = null;
                    this.buffer = '';
                    throw new PacketLengthException(rawContentLength);
                }
                this.buffer = this.buffer.substring(i + 1);
            }
        }

        if (this.contentLength !== null) {
            const length = this.buffer.length;
            if (length === this.contentLength) {
                this.handleMessage(this.buffer);
            } else if (length > this.contentLength) {
                const message = this.buffer.substring(0, this.contentLength);
                const rest = this.buffer.substring(this.contentLength);
                this.handleMessage(message);
                this.handleData(rest);
            }
        }
    }

    private handleMessage(message: any) {
        this.contentLength = null;
        this.buffer = '';
        this.emitMessage(message);
    }

    protected emitMessage(data: string) {
        let message: Record<string, unknown>;
        try {
            message = JSON.parse(data);
        } catch (e) {
            throw new InvalidJsonException(e, data);
        }
        message = message || {};
        this.socket.emit(ev.MESSAGE, message);
    }

    private _headerSent = false;
    get headerSent(): boolean {
        return this._headerSent;
    }

}


