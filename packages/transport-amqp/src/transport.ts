import { Decoder, Encoder, Packet, TransportSession, TransportSessionFactory } from '@tsdi/core';
import { EMPTY_OBJ, Injectable, Optional, isString } from '@tsdi/ioc';
import { AbstractTransportSession, StreamAdapter, ev, hdr, toBuffer } from '@tsdi/transport';
import { Channel, ConsumeMessage } from 'amqplib';
import { Buffer } from 'buffer';
import { AmqpSessionOpts } from './options';


@Injectable()
export class AmqpTransportSessionFactory implements TransportSessionFactory<Channel> {

    constructor(
        private adapter: StreamAdapter,
        @Optional() private encoder: Encoder,
        @Optional() private decoder: Decoder) {

    }

    create(socket: Channel, opts: AmqpSessionOpts): TransportSession<Channel> {
        return new AmqpTransportSession(socket, this.adapter, opts.encoder ?? this.encoder, opts.decoder ?? this.decoder, opts);
    }

}

export interface QueueBuffer {
    queue: string;
    buffer: Buffer | null;
    contentLength: number | null;
    cachePkg: Map<number | string, Packet>;

}

export class AmqpTransportSession extends AbstractTransportSession<Channel, AmqpSessionOpts> {
    protected queues: Map<string, QueueBuffer> = new Map();

    protected override bindMessageEvent(options: AmqpSessionOpts): void {
        const queue = options.serverSide ? options.queue! : options.replyQueue!;
        this.socket.consume(queue, msg => {
            if (!msg) return;
            this.onData(
                queue,
                msg
            )
        }, {
            noAck: true,
            ...this.options.consumeOpts
        });
    }

    protected writeBuffer(buffer: Buffer, packet: Packet) {
        const queue = this.options.serverSide ? packet.replyTo ?? this.options.replyQueue! : this.options.queue!;
        const headers = this.options.publishOpts?.headers ? { ...this.options.publishOpts.headers, ...packet.headers } : packet.headers;
        headers[hdr.PATH] = packet.url ?? packet.topic;
        const replys = this.options.serverSide ? undefined : {
            replyTo: packet.replyTo ?? this.options.replyQueue,
            persistent: this.options.persistent,
        };
        this.socket.sendToQueue(
            queue,
            buffer,
            {
                ...replys,
                ...this.options.publishOpts,
                headers,
                contentType: headers[hdr.CONTENT_TYPE],
                contentEncoding: headers[hdr.CONTENT_ENCODING],
                correlationId: packet.id,
            }
        )
    }
    protected handleFailed(error: any): void {
        this.emit(ev.ERROR, error.message)
    }
    protected onSocket(name: string, event: (...args: any[]) => void): void {
        this.socket.on(name, event)
    }
    protected offSocket(name: string, event: (...args: any[]) => void): void {
        this.socket.off(name, event)
    }

    protected override async generate(data: Packet): Promise<Buffer> {
        const { payload, ...headers } = data;
        if (!headers.headers) {
            headers.headers = {};
        }

        let body: Buffer;
        if (isString(payload)) {
            body = Buffer.from(payload);
        } else if (Buffer.isBuffer(payload)) {
            body = payload;
        } else if (this.streamAdapter.isReadable(payload)) {
            body = await toBuffer(payload);
        } else {
            body = Buffer.from(JSON.stringify(payload));
        }

        if (!headers.headers[hdr.CONTENT_LENGTH]) {
            headers.headers[hdr.CONTENT_LENGTH] = Buffer.byteLength(body);
        }

        if (this.encoder) {
            body = this.encoder.encode(body);
            if (isString(body)) body = Buffer.from(body);
            headers.headers[hdr.CONTENT_LENGTH] = Buffer.byteLength(body);
        }

        return body;

    }

    protected override async generateNoPayload(data: Packet<any>): Promise<Buffer> {
        return Buffer.alloc(0);
    }


    protected onData(queue: string, msg: ConsumeMessage): void {
        try {
            let chl = this.queues.get(queue);
            if (!chl) {
                chl = {
                    queue,
                    buffer: null,
                    contentLength: ~~msg.properties.headers[hdr.CONTENT_LENGTH],
                    cachePkg: new Map()
                }
                this.queues.set(queue, chl)
            }
            if (!chl.cachePkg.has(msg.properties.correlationId)) {
                const headers = { ...msg.properties.headers };
                if (!headers[hdr.CONTENT_TYPE]) {
                    headers[hdr.CONTENT_TYPE] = msg.properties.contentType;
                }
                if (!headers[hdr.CONTENT_ENCODING]) {
                    headers[hdr.CONTENT_ENCODING] = msg.properties.contentEncoding;
                }
                chl.cachePkg.set(msg.properties.correlationId, {
                    id: msg.properties.correlationId,
                    url: headers[hdr.PATH],
                    replyTo: msg.properties.replyTo,
                    headers
                })
            }
            this.handleData(chl, msg.properties.correlationId, msg.content);
        } catch (ev) {
            const e = ev as any;
            this.emit(e.ERROR, e.message);
        }
        msg.properties.headers
    }

    protected handleData(chl: QueueBuffer, id: string, dataRaw: string | Buffer) {

        const data = Buffer.isBuffer(dataRaw)
            ? dataRaw
            : Buffer.from(dataRaw);
        const buffer = chl.buffer = chl.buffer ? Buffer.concat([chl.buffer, data], chl.buffer.length + data.length) : Buffer.from(data);

        if (chl.contentLength !== null) {
            const length = buffer.length;
            if (length === chl.contentLength) {
                this.handleMessage(chl, id, chl.buffer);
            } else if (length > chl.contentLength) {
                const message = chl.buffer.slice(0, chl.contentLength);
                const rest = chl.buffer.slice(chl.contentLength);
                this.handleMessage(chl, id, message);
                this.handleData(chl, id, rest);
            }
        }
    }

    protected handleMessage(chl: QueueBuffer, id: string, message: any) {
        chl.contentLength = null;
        chl.buffer = null;
        this.emitMessage(chl, id, message);
    }

    protected emitMessage(chl: QueueBuffer, id: string, chunk: Buffer) {
        const data = this.decoder ? this.decoder.decode(chunk) as Buffer : chunk;
        const pkg = chl.cachePkg.get(id);
        if (pkg) {
            pkg.payload = data.length ? data : null;
            chl.cachePkg.delete(id);
            this.emit(ev.MESSAGE, chl.queue, pkg);
        }
    }
}
