import { Encoder, InvalidJsonException, Packet, TransportSession, TransportSessionFactory, TransportSessionOpts } from '@tsdi/core';
import { Execption, Injectable } from '@tsdi/ioc';
import { PacketLengthException, StreamAdapter, ev, isBuffer } from '@tsdi/transport';
import { Duplex } from 'stream';
import { NumberAllocator } from 'number-allocator';
import { EventEmitter } from 'events';

@Injectable()
export class TcpTransportSessionFactory<TSocket extends Duplex = any> implements TransportSessionFactory<TSocket> {

    constructor(readonly streamAdapter: StreamAdapter) {

    }

    create(socket: TSocket, opts: TransportSessionOpts): TransportSession<TSocket> {
        return new TcpTransportSession(socket, this.streamAdapter, opts.delimiter);
    }


}

export class TcpTransportSession<TSocket extends Duplex = any> extends EventEmitter implements TransportSession<TSocket> {

    allocator = new NumberAllocator(1, 65536);
    last?: number;
    private buffer = '';
    private contentLength: number | null = null;

    constructor(readonly socket: TSocket, private streamAdapter: StreamAdapter, private readonly delimiter = '\n', private readonly headDelimiter = '#') {
        super()
    }

    getStreamId() {
        const id = this.allocator.alloc();
        if (!id) {
            throw new Execption('alloc stream id failed');
        }
        this.last = id;
        return id;
    }


    async send(data: Packet, encoder?: Encoder): Promise<void> {
        if (encoder) {
            const msg = encoder.encode(data) as string | Buffer;
            this.socket.write(msg.length);
            this.socket.write(this.delimiter);
            this.socket.write(msg);
        } else if (isBuffer(data.payload)) {
            const { payload, ...headers } = data;
            const hmsg = JSON.stringify(headers);
            this.socket.write(hmsg.length);
            this.socket.write(this.delimiter);
            this.socket.write(hmsg);
            this.socket.write(this.headDelimiter);
            this.socket.write(payload);
            this.socket.write(this.delimiter);

        } else if (this.streamAdapter.isStream(data.payload)) {
            const { payload, ...headers } = data;
            const hmsg = JSON.stringify(headers);
            this.socket.write(hmsg.length);
            this.socket.write(this.delimiter);
            this.socket.write(hmsg);
            this.socket.write(payload);

        } else {
            this.socket.write(this.formatMessage(data));
        }
    }

    protected formatMessage(data: Packet) {
        let msg = JSON.stringify(data);
        const messageData = JSON.stringify(msg);
        const length = messageData.length;
        msg = length + this.delimiter + messageData;
        return msg;
    }

    destroy(error?: any): void {
        this.socket.end();
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

}



