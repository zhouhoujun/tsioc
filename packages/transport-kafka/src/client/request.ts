import {
    TransportEvent, Encoder, Decoder, TransportRequest, Redirector, TransportSession, Packet, StreamAdapter, StatusVaildator, UuidGenerator, ResHeaders, Incoming
} from '@tsdi/core';
import { Injectable, Optional } from '@tsdi/ioc';
import { MimeTypes, MimeAdapter, SessionRequestAdapter, ev, StatusPacket, hdr } from '@tsdi/transport';
import { Observer } from 'rxjs';
import { KAFKA_CLIENT_OPTS, KafkaClientOpts } from './options';
import { KafkaTransport } from '../const';

/**
 * kafka request adapter.
 */
@Injectable()
export class KafkaRequestAdapter extends SessionRequestAdapter<KafkaTransport, KafkaClientOpts> {

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
    }

    protected getClientOpts(req: TransportRequest<any>): KafkaClientOpts {
        return req.context.get(KAFKA_CLIENT_OPTS)
    }

    protected getReply(url: string, observe: 'body' | 'events' | 'response' | 'emit'): string {
        switch (observe) {
            case 'emit':
                return '';
            default:
                return url + '.reply'
        }
    }

    protected bindMessageEvent(session: TransportSession<KafkaTransport>, packet: Packet, req: TransportRequest<any>, observer: Observer<TransportEvent>, opts: KafkaClientOpts): [string, (...args: any[]) => void] {
        const replyTopic = packet.replyTo;
        const id = packet.id!;
        const url = packet.topic || packet.url!;
        const onMessage = (topic: string, res: Packet) => {
            if (topic !== replyTopic) return;
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

