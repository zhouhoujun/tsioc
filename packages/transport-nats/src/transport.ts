import { Decoder, Encoder, HeaderPacket, IReadableStream, IncomingHeaders, Packet, SendOpts, StreamAdapter, TransportSession, TransportSessionFactory } from '@tsdi/core';
import { Abstract, Injectable, Optional, isString } from '@tsdi/ioc';
import { AbstractTransportSession, ev, hdr, toBuffer } from '@tsdi/transport';
import { Msg, NatsConnection, headers as createHeaders } from 'nats';
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




export interface SubjectBuffer {
    subject: string;
    buffer: Buffer | null;
    contentLength: number | null;
    pkgs: Map<number | string, Packet>;

}

export class NatsTransportSession extends AbstractTransportSession<NatsConnection, NatsSessionOpts> {

    protected subjects: Map<string, SubjectBuffer> = new Map();

    protected override bindMessageEvent(options: NatsSessionOpts): void {
        const onRespond = this.onData.bind(this);
        this.onSocket(ev.CUSTOM_MESSAGE, onRespond);
        this._evs.push([ev.CUSTOM_MESSAGE, onRespond]);
    }

    protected override getBindEvents(): string[] {
        return [];
    }

    write(chunk: Buffer, packet: HeaderPacket, callback?: (err?: any) => void): void {
        const topic = packet.topic ?? packet.url!;
        const headers = this.options.publishOpts?.headers ?? createHeaders();
        packet.headers && Object.keys(packet.headers).forEach(k => {
            headers.set(k, String(packet?.headers?.[k] ?? ''))
        });

        headers.set(hdr.IDENTITY, packet.id);

        const replys = this.options.serverSide ? undefined : {
            reply: packet.replyTo
        };
        try {
            this.socket.publish(
                topic,
                chunk,
                {
                    ...this.options.publishOpts,
                    ...replys,
                    headers
                }
            )
            callback && callback();
        } catch (err) {
            callback && callback(err);
            throw err;
        }
    }
    protected pipeStream(payload: IReadableStream, headers: HeaderPacket, options?: SendOpts | undefined): Promise<void> {
        throw new Error('Method not implemented.');
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
        this.on(name, event)
    }
    protected offSocket(name: string, event: (...args: any[]) => void): void {
        this.off(name, event)
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


    protected onData(error: Error | null, msg: Msg): void {
        try {
            const subject = msg.subject;
            if (this.options.serverSide && (!msg.reply || subject.endsWith('.reply'))) return;
            let chl = this.subjects.get(subject);
            if (!chl) {
                chl = {
                    subject: subject,
                    buffer: null,
                    contentLength: ~~(msg.headers?.get(hdr.CONTENT_LENGTH) ?? '0'),
                    pkgs: new Map()
                }
                this.subjects.set(subject, chl)
            } else if (chl.contentLength === null) {
                chl.buffer = null;
                chl.contentLength = ~~(msg.headers?.get(hdr.CONTENT_LENGTH) ?? '0');
            }
            const id = msg.headers?.get(hdr.IDENTITY) ?? msg.sid;
            if (id && !chl.pkgs.has(id)) {
                const headers: IncomingHeaders = {};
                msg.headers?.keys().forEach(key => {
                    headers[key] = msg.headers?.get(key);
                });

                chl.pkgs.set(id, {
                    id,
                    error,
                    url: msg.subject,
                    replyTo: msg.reply,
                    headers
                })
            }
            this.handleData(chl, id, msg.data);
        } catch (ev) {
            const e = ev as any;
            this.emit(e.ERROR, e.message);
        }
    }

    protected handleData(chl: SubjectBuffer, id: string | number, dataRaw: string | Buffer | Uint8Array) {

        const data = Buffer.isBuffer(dataRaw)
            ? dataRaw
            : Buffer.from(dataRaw);
        const buffer = chl.buffer = chl.buffer ? Buffer.concat([chl.buffer, data], chl.buffer.length + data.length) : Buffer.from(data);

        if (chl.contentLength !== null) {
            const length = buffer.length;
            if (length === chl.contentLength) {
                this.handleMessage(chl, id, chl.buffer);
            } else if (length > chl.contentLength) {
                const message = chl.buffer.subarray(0, chl.contentLength);
                const rest = chl.buffer.subarray(chl.contentLength);
                this.handleMessage(chl, id, message);
                this.handleData(chl, id, rest);
            }
        }
    }

    protected handleMessage(chl: SubjectBuffer, id: string | number, message: any) {
        chl.contentLength = null;
        chl.buffer = null;
        this.emitMessage(chl, id, message);
    }

    protected emitMessage(chl: SubjectBuffer, id: string | number, chunk: Buffer) {
        const data = this.decoder ? this.decoder.decode(chunk) as Buffer : chunk;
        const pkg = chl.pkgs.get(id);
        if (pkg) {
            pkg.payload = data.length ? data : null;
            chl.pkgs.delete(id);
            this.emit(ev.MESSAGE, chl.subject, pkg);
        }
    }
}
