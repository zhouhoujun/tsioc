import { Decoder, Encoder, HeaderPacket, IncomingHeaders, StreamAdapter, TransportSession, TransportSessionFactory } from '@tsdi/core';
import { Abstract, Injectable, Optional } from '@tsdi/ioc';
import { MessageTransportSession, Subpackage, ev, hdr } from '@tsdi/transport';
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



export class AmqpTransportSession extends MessageTransportSession<Channel, ConsumeMessage, AmqpSessionOpts> {

    maxSize = 1024 * 256;

    protected override bindMessageEvent(options: AmqpSessionOpts): void {
        const onRespond = (queue: string, msg: ConsumeMessage) => {
            this.onData(msg, queue);
        }
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

    write(packet: Subpackage, chunk: Buffer | null, callback?: (err?: any) => void): void {
        if (!packet.headerSent) {
            const headers = this.options.publishOpts?.headers ? { ...this.options.publishOpts.headers, ...packet.headers } : packet.headers;
            headers[hdr.PATH] = packet.url ?? packet.topic;
            packet.headers = headers;
            packet.headerSent = true;
            packet.caches = [];
            packet.residueSize = this.getPayloadLength(packet);
            if (!packet.residueSize) {
                this.writing(packet, null, callback);
                return;
            }
        }

        if (!chunk) return callback?.();

        const bufSize = Buffer.byteLength(chunk);
        const maxSize = this.options.maxSize || this.maxSize;

        const tol = packet.cacheSize + bufSize;
        if (tol == maxSize) {
            packet.caches.push(chunk);
            const data = this.getSendBuffer(packet, maxSize);
            packet.residueSize -= bufSize;
            this.writing(packet, data, callback);
        } else if (tol > maxSize) {
            const idx = bufSize - (tol - maxSize);
            const message = chunk.subarray(0, idx);
            const rest = chunk.subarray(idx);
            packet.caches.push(message);
            const data = this.getSendBuffer(packet, maxSize);
            packet.residueSize -= (bufSize - Buffer.byteLength(rest));
            this.writing(packet, data, (err) => {
                if (err) return callback?.(err);
                if (rest.length) {
                    this.write(packet, rest, callback)
                }
            })
        } else {
            packet.caches.push(chunk);
            packet.cacheSize += bufSize;
            packet.residueSize -= bufSize;
            if (packet.residueSize <= 0) {
                const data = this.getSendBuffer(packet, packet.cacheSize);
                this.writing(packet, data, callback);
            } else if (callback) {
                callback()
            }
        }
    }

    writing(packet: HeaderPacket, chunk: Buffer | null, callback?: (err?: any) => void): void {
        const queue = this.options.serverSide ? this.options.replyQueue! : this.options.queue!;
        const replys = this.options.serverSide ? undefined : {
            replyTo: packet.replyTo,
            persistent: this.options.persistent,
        };
        const headers = packet.headers!;
        const succeeded = this.socket.sendToQueue(
            queue,
            chunk ?? Buffer.alloc(0),
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

    protected createPackage(id: string | number, topic: string, replyTo: string, headers: IncomingHeaders, msg: ConsumeMessage, error?: any): HeaderPacket {
        return {
            id,
            url: headers[hdr.PATH],
            replyTo,
            headers
        }
    }
    protected getIncomingHeaders(msg: ConsumeMessage): IncomingHeaders {
        return { ...msg.properties.headers };
    }
    protected getIncomingPacketId(msg: ConsumeMessage): string | number {
        return msg.properties.correlationId
    }
    protected getIncomingReplyTo(msg: ConsumeMessage): string {
        return msg.properties.replyTo
    }
    protected getIncomingContentType(msg: ConsumeMessage): string | undefined {
        return msg.properties.contentType
    }
    protected getIncomingContentEncoding(msg: ConsumeMessage): string | undefined {
        return msg.properties.contentEncoding
    }
    protected getIncomingContentLength(msg: ConsumeMessage): number {
        return ~~msg.properties.headers[hdr.CONTENT_LENGTH]
    }
    protected getIncomingPayload(msg: ConsumeMessage): string | Buffer | Uint8Array {
        return msg.content
    }

}
