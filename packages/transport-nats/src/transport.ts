import { Decoder, Encoder, HeaderPacket, IncomingHeaders, OutgoingHeaders, Packet, StreamAdapter, TransportSession, TransportSessionFactory } from '@tsdi/core';
import { Abstract, EMPTY, Injectable, Optional } from '@tsdi/ioc';
import { MessageTransportSession, Subpackage, ev, hdr } from '@tsdi/transport';
import { Msg, MsgHdrs, NatsConnection, headers as createHeaders } from 'nats';
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


export class NatsTransportSession extends MessageTransportSession<NatsConnection, Msg, NatsSessionOpts> {

    maxSize = 1024 * 256;

    protected override bindMessageEvent(options: NatsSessionOpts): void {
        const onRespond = (error: Error | null, msg: Msg) => {
            if (this.options.serverSide && (!msg.reply || msg.subject.endsWith('.reply'))) return;
            this.onData(msg, msg.subject, error);
        }
        this.onSocket(ev.CUSTOM_MESSAGE, onRespond);
        this._evs.push([ev.CUSTOM_MESSAGE, onRespond]);
    }

    protected override getBindEvents(): string[] {
        return EMPTY;
    }

    write(packet: Subpackage & { natsheaders: MsgHdrs }, chunk: Buffer | null, callback?: (err?: any) => void): void {
        if (!packet.headerSent) {
            const headers = this.options.publishOpts?.headers ?? createHeaders();
            packet.headers && Object.keys(packet.headers).forEach(k => {
                headers.set(k, String(packet?.headers?.[k] ?? ''))
            });
            headers.set(hdr.IDENTITY, packet.id);
            packet.natsheaders = headers;
            packet.headerSent = true;
            packet.caches = [];
            packet.cacheSize = 0;
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
                if (err) {
                    return callback?.(err);
                }
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

    writing(packet: HeaderPacket & { natsheaders: MsgHdrs }, chunk: Buffer | null, callback?: (err?: any) => void) {
        const topic = packet.topic || packet.url!;
        const replys = this.options.serverSide ? undefined : {
            reply: packet.replyTo
        };
        try {
            this.socket.publish(
                topic,
                chunk ?? Buffer.alloc(0),
                {
                    ...this.options.publishOpts,
                    ...replys,
                    headers: packet.natsheaders
                }
            )
            callback?.();
        } catch (err) {
            this.handleFailed(err);
            if(callback) {
                callback(err);
            } else {
                throw err;
            }
        }
    }

    protected onSocket(name: string, event: (...args: any[]) => void): void {
        this.on(name, event)
    }
    protected offSocket(name: string, event: (...args: any[]) => void): void {
        this.off(name, event)
    }


    protected createPackage(id: string | number, topic: string, replyTo: string, headers: IncomingHeaders, msg: Msg, error?: any): HeaderPacket {
        return {
            id,
            error,
            url: msg.subject,
            replyTo,
            headers
        }
    }

    protected getIncomingHeaders(msg: Msg): OutgoingHeaders {
        const headers = {} as OutgoingHeaders;
        msg.headers?.keys().forEach(key => {
            headers[key] = msg.headers?.get(key);
        });
        return headers
    }
    protected getIncomingPacketId(msg: Msg): string | number {
        return msg.headers?.get(hdr.IDENTITY) ?? msg.sid;
    }
    protected getIncomingReplyTo(msg: Msg): string {
        return msg.reply!;
    }
    protected getIncomingContentType(msg: Msg): string | undefined {
        return msg.headers?.get(hdr.CONTENT_TYPE)
    }
    protected getIncomingContentEncoding(msg: Msg): string | undefined {
        return msg.headers?.get(hdr.CONTENT_ENCODING);
    }
    protected getIncomingContentLength(msg: Msg): number {
        return ~~(msg.headers?.get(hdr.CONTENT_LENGTH) ?? '0')
    }
    protected getIncomingPayload(msg: Msg): string | Buffer | Uint8Array {
        return msg.data;
    }
}
