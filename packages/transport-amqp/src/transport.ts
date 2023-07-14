import { Decoder, Encoder, HeaderPacket, IReadableStream, Packet, SendOpts, StreamAdapter, TransportSession, TransportSessionFactory } from '@tsdi/core';
import { Abstract, Injectable, Optional, isString } from '@tsdi/ioc';
import { AbstractTransportSession, ev, hdr } from '@tsdi/transport';
import { Channel, ConsumeMessage } from 'amqplib';
import { Buffer } from 'buffer';
import { AmqpSessionOpts } from './options';


@Abstract()
export abstract class AmqpTransportSessionFactory extends TransportSessionFactory<Channel> {

}

@Injectable()
export class AmqpTransportSessionFactoryImpl implements TransportSessionFactory<Channel> {

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
    buffers: Buffer[];
    length: number;
    contentLength: number | null;
    pkgs: Map<number | string, Packet>;

}

export class AmqpTransportSession extends AbstractTransportSession<Channel, AmqpSessionOpts> {
    protected queues: Map<string, QueueBuffer> = new Map();

    protected override bindMessageEvent(options: AmqpSessionOpts): void {
        const onRespond = this.onData.bind(this);
        this.onSocket(ev.CUSTOM_MESSAGE, onRespond);
        this._evs.push([ev.CUSTOM_MESSAGE, onRespond]);
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

    write(chunk: Buffer, packet: HeaderPacket, callback?: (err?: any) => void): void {
        const queue = this.options.serverSide ? this.options.replyQueue! : this.options.queue!;
        const headers = this.options.publishOpts?.headers ? { ...this.options.publishOpts.headers, ...packet.headers } : packet.headers;
        headers[hdr.PATH] = packet.url ?? packet.topic;
        const replys = this.options.serverSide ? undefined : {
            replyTo: packet.replyTo,
            persistent: this.options.persistent,
        };
        const succeeded = this.socket.sendToQueue(
            queue,
            chunk,
            {
                ...replys,
                ...this.options.publishOpts,
                headers,
                contentType: headers[hdr.CONTENT_TYPE],
                contentEncoding: headers[hdr.CONTENT_ENCODING],
                correlationId: packet.id,
            }
        );

        callback && callback(succeeded ? undefined : 'sendToQueue failed.');
    }

    protected override async generate(payload: any, packet: HeaderPacket, options?: SendOpts): Promise<Buffer> {

        let body: Buffer;
        if (isString(payload)) {
            body = Buffer.from(payload);
        } else if (Buffer.isBuffer(payload)) {
            body = payload;
        } else {
            body = Buffer.from(JSON.stringify(payload));
        }

        if (!this.hasPayloadLength(packet)) {
            this.setPayloadLength(packet, Buffer.byteLength(body));
        }

        if (this.encoder) {
            body = this.encoder.encode(body);
            this.setPayloadLength(packet, Buffer.byteLength(body));
        }

        return body;

    }

    protected override async generateNoPayload(packet: HeaderPacket, options?: SendOpts): Promise<Buffer> {
        this.setPayloadLength(packet, 0);
        return Buffer.alloc(0);
    }


    protected onData(queue: string, msg: ConsumeMessage): void {
        try {
            let chl = this.queues.get(queue);
            if (!chl) {
                chl = {
                    queue,
                    buffers: [],
                    length: 0,
                    contentLength: ~~msg.properties.headers[hdr.CONTENT_LENGTH],
                    pkgs: new Map()
                }
                this.queues.set(queue, chl)
            } else if (chl.contentLength === null) {
                chl.buffers = [];
                chl.contentLength = ~~msg.properties.headers[hdr.CONTENT_LENGTH];
            }
            if (!chl.pkgs.has(msg.properties.correlationId)) {
                const headers = { ...msg.properties.headers };
                if (!headers[hdr.CONTENT_TYPE]) {
                    headers[hdr.CONTENT_TYPE] = msg.properties.contentType;
                }
                if (!headers[hdr.CONTENT_ENCODING]) {
                    headers[hdr.CONTENT_ENCODING] = msg.properties.contentEncoding;
                }
                chl.pkgs.set(msg.properties.correlationId, {
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
    }

    protected handleData(chl: QueueBuffer, id: string, dataRaw: string | Buffer) {

        const data = Buffer.isBuffer(dataRaw)
            ? dataRaw
            : Buffer.from(dataRaw);

        chl.buffers.push(data);
        chl.length += data.length;

        if (chl.contentLength !== null) {
            const length = chl.length;
            if (length === chl.contentLength) {
                this.handleMessage(chl, id, this.concatCaches(chl));
            } else if (length > chl.contentLength) {
                const buffer = this.concatCaches(chl);
                const message = buffer.subarray(0, chl.contentLength);
                const rest = buffer.subarray(chl.contentLength);
                this.handleMessage(chl, id, message);
                this.handleData(chl, id, rest);
            }
        }
    }

    protected concatCaches(chl: QueueBuffer) {
        return chl.buffers.length > 1 ? Buffer.concat(chl.buffers) : chl.buffers[0]
    }

    protected handleMessage(chl: QueueBuffer, id: string, message: any) {
        chl.contentLength = null;
        chl.length = 0;
        chl.buffers = [];
        this.emitMessage(chl, id, message);
    }

    protected emitMessage(chl: QueueBuffer, id: string, chunk: Buffer) {
        const data = this.decoder ? this.decoder.decode(chunk) as Buffer : chunk;
        const pkg = chl.pkgs.get(id);
        if (pkg) {
            let payload = data;
            if (pkg.payload) {
                if (data.length) {
                    payload = pkg.payload = Buffer.concat([pkg.payload, data]);
                }
            } else {
                pkg.payload = data.length ? data : null;
            }

            const len = this.getPayloadLength(pkg);
            if (len && payload.length == len) {
                chl.pkgs.delete(id);
                this.emit(ev.MESSAGE, chl.queue, pkg);
            } else if (!len) {
                this.emit(ev.MESSAGE, pkg);
            }
        }
    }
}
