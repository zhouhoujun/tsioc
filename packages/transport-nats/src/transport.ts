import { Decoder, Encoder, Packet, StreamAdapter, TransportSession, TransportSessionFactory } from '@tsdi/core';
import { Abstract, Injectable, Optional, isString } from '@tsdi/ioc';
import { AbstractTransportSession, ev, hdr, toBuffer } from '@tsdi/transport';
import { NatsConnection } from 'nats';
import { Buffer } from 'buffer';
import { NatsSessionOpts } from './options';


@Abstract()
export abstract class NatsTransportSessionFactory extends TransportSessionFactory<NatsConnection> {

}

@Injectable()
export class NatsTransportSessionFactoryImpl implements TransportSessionFactory<NatsConnection> {

    constructor(
        private adapter: StreamAdapter,
        @Optional() private encoder: Encoder,
        @Optional() private decoder: Decoder) {

    }

    create(socket: NatsConnection, opts: NatsSessionOpts): TransportSession<NatsConnection> {
        return new NatsTransportSession(socket, this.adapter, opts.encoder ?? this.encoder, opts.decoder ?? this.decoder, opts);
    }

}




export interface QueueBuffer {
    queue: string;
    buffer: Buffer | null;
    contentLength: number | null;
    pkgs: Map<number | string, Packet>;

}

export class NatsTransportSession extends AbstractTransportSession<NatsConnection, NatsSessionOpts> {
    protected queues: Map<string, QueueBuffer> = new Map();

    protected override bindMessageEvent(options: NatsSessionOpts): void {
        const onRespond = this.onData.bind(this);
        this.onSocket(ev.CUSTOM_MESSAGE, onRespond);
        this._evs.push([ev.CUSTOM_MESSAGE, onRespond]);
    }

    protected writeBuffer(buffer: Buffer, packet: Packet) {
        const topic = packet.topic ?? packet.url!;
        const headers = this.options.publishOpts?.headers ? { ...this.options.publishOpts.headers, ...packet.headers } : packet.headers;
        const replys = this.options.serverSide ? undefined : {
            reply: packet.replyTo
        };
        this.socket.publish(
            topic,
            buffer,
            {
                ...replys,
                ...this.options.publishOpts,
                headers,
                // contentType: headers[hdr.CONTENT_TYPE],
                // contentEncoding: headers[hdr.CONTENT_ENCODING],
                // correlationId: packet.id,
            }
        )
    }

    protected getReply(url: string, observe: 'body' | 'events' | 'response' | 'emit'): string {
        switch (observe) {
            case 'emit':
                return '';
            default:
                return url + '.reply'
        }
    }

    protected handleFailed(error: any): void {
        this.emit(ev.ERROR, error.message)
    }
    protected onSocket(name: string, event: (...args: any[]) => void): void {
        // this.socket.on(name, event)
    }
    protected offSocket(name: string, event: (...args: any[]) => void): void {
        // this.socket.off(name, event)
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
        if (!data.headers) {
            data.headers = {};
        }
        data.headers[hdr.CONTENT_LENGTH] = 0;

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
                    pkgs: new Map()
                }
                this.queues.set(queue, chl)
            } else if (chl.contentLength === null) {
                chl.buffer = null;
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
        const pkg = chl.pkgs.get(id);
        if (pkg) {
            pkg.payload = data.length ? data : null;
            chl.pkgs.delete(id);
            this.emit(ev.MESSAGE, chl.queue, pkg);
        }
    }
}
