import { UuidGenerator } from '@tsdi/core';
import { Injectable, Optional } from '@tsdi/ioc';
import { Packet, TransportEvent, TransportRequest } from '@tsdi/common';
import { Encoder, Decoder, Redirector, StatusVaildator, StreamAdapter, TransportSession, Incoming, ev, MimeTypes, MimeAdapter, SessionRequestAdapter, hdr, StatusPacket } from '@tsdi/transport';
import { Observer } from 'rxjs';
import { NatsConnection, Msg } from 'nats';
import { NATS_CLIENT_OPTS, NatsClientOpts } from './options';


@Injectable()
export class NatsRequestAdapter extends SessionRequestAdapter<NatsConnection> {

    subs: Set<string>;

    constructor(
        readonly mimeTypes: MimeTypes,
        readonly vaildator: StatusVaildator<number | string>,
        readonly streamAdapter: StreamAdapter,
        readonly mimeAdapter: MimeAdapter,
        @Optional() readonly redirector: Redirector<number | string>,
        @Optional() readonly encoder: Encoder,
        @Optional() readonly decoder: Decoder,
        private uuidGenner: UuidGenerator) {
        super()
        this.subs = new Set();
    }

    protected getReply(url: string, observe: 'body' | 'events' | 'response' | 'emit'): string {
        switch (observe) {
            case 'emit':
                return '';
            default:
                return url + '.reply'
        }
    }

    protected getClientOpts(req: TransportRequest<any>) {
        return req.context.get(NATS_CLIENT_OPTS)
    }

    protected bindMessageEvent(session: TransportSession<NatsConnection>, packet: Packet, req: TransportRequest<any>, observer: Observer<TransportEvent>, opts: NatsClientOpts): [string, (...args: any[]) => void] {
        const reply = packet.replyTo;
        if (!reply) return [] as any;

        if (!this.subs.has(reply)) {
            this.subs.add(reply);
           session.socket.subscribe(reply, {
            ...opts.subscriptionOpts,
            callback: (err: any, msg:Msg) => {
                session.emit(ev.CUSTOM_MESSAGE, err, msg);
            }
           });
        }

        const id = packet.id!;
        const url = packet.topic || packet.url!;
        const onMessage = (topic: string, res: Packet) => {
            if (topic !== reply || res.id !== id) return;
            this.handleMessage(id, url, req, observer, res);
        };

        session.on(ev.MESSAGE, onMessage);

        return [ev.MESSAGE, onMessage];
    }

    protected override getPacketId(): string {
        return this.uuidGenner.generate()
    }

    protected override parseStatusPacket(incoming: Incoming): StatusPacket<number> {
        return {
            headers: incoming.headers,
            status: ~~(incoming.headers[hdr.STATUS] ?? this.vaildator.none.toString()),
            statusText: String(incoming.headers[hdr.STATUS_MESSAGE]),
            body: incoming.body,
            payload: incoming.payload
        }
    }

}

