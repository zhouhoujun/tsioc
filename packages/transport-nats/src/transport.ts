import { Abstract, EMPTY, Injectable, Optional } from '@tsdi/ioc';
import { HeaderPacket, IncomingHeaders, OutgoingHeaders } from '@tsdi/common';
import { Decoder, Encoder, StreamAdapter, TransportSession, TransportSessionFactory, MessageTransportSession, Subpackage, ev, hdr } from '@tsdi/transport';
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


export const defaultMaxSize = 1024 * 256;


export class NatsTransportSession extends MessageTransportSession<NatsConnection, Msg, NatsSessionOpts> {

    maxSize = defaultMaxSize;

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

    write(subpkg: Subpackage & { natsheaders: MsgHdrs }, chunk: Buffer | null, callback?: (err?: any) => void): void {
        if (!subpkg.headerSent) {
            const headers = this.options.publishOpts?.headers ?? createHeaders();
            subpkg.packet.headers && Object.keys(subpkg.packet.headers).forEach(k => {
                headers.set(k, String(subpkg.packet?.headers?.[k] ?? ''))
            });
            headers.set(hdr.IDENTITY, subpkg.packet.id);
            subpkg.natsheaders = headers;
            subpkg.headerSent = true;
            subpkg.caches = [];
            subpkg.cacheSize = 0;
            subpkg.residueSize = this.getPayloadLength(subpkg.packet);
            if (!subpkg.residueSize) {
                this.writing(subpkg, null, callback);
                return;
            }
        }

        if (!chunk) return callback?.();

        const bufSize = Buffer.byteLength(chunk);
        const maxSize = this.options.maxSize || this.maxSize;

        const tol = subpkg.cacheSize + bufSize;
        if (tol == maxSize) {
            subpkg.caches.push(chunk);
            const data = this.getSendBuffer(subpkg, maxSize);
            subpkg.residueSize -= bufSize;
            this.writing(subpkg, data, callback);
        } else if (tol > maxSize) {
            const idx = bufSize - (tol - maxSize);
            const message = chunk.subarray(0, idx);
            const rest = chunk.subarray(idx);
            subpkg.caches.push(message);
            const data = this.getSendBuffer(subpkg, maxSize);
            subpkg.residueSize -= (bufSize - Buffer.byteLength(rest));
            this.writing(subpkg, data, (err) => {
                if (err) {
                    return callback?.(err);
                }
                if (rest.length) {
                    this.write(subpkg, rest, callback)
                }
            })
        } else {
            subpkg.caches.push(chunk);
            subpkg.cacheSize += bufSize;
            subpkg.residueSize -= bufSize;
            if (subpkg.residueSize <= 0) {
                const data = this.getSendBuffer(subpkg, subpkg.cacheSize);
                this.writing(subpkg, data, callback);
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
