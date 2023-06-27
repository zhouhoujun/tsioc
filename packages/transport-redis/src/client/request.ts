import { TransportEvent, Encoder, Decoder, TransportRequest, Redirector, StreamAdapter, StatusVaildator, TransportSession, Packet } from '@tsdi/core';
import { Injectable, Optional } from '@tsdi/ioc';
import { ev, MimeTypes, MimeAdapter, SessionRequestAdapter } from '@tsdi/transport';
import { Observer } from 'rxjs';
import { REDIS_CLIENT_OPTS, RedisClientOpts } from './options';
import { ReidsTransport } from '../transport';

/**
 * Redis Request adapter.
 */
@Injectable()
export class RedisRequestAdapter extends SessionRequestAdapter<ReidsTransport, RedisClientOpts> {

    subs: Set<string>;

    constructor(
        readonly mimeTypes: MimeTypes,
        readonly vaildator: StatusVaildator<number | string>,
        readonly streamAdapter: StreamAdapter,
        readonly mimeAdapter: MimeAdapter,
        @Optional() readonly redirector: Redirector<number | string>,
        @Optional() readonly encoder: Encoder,
        @Optional() readonly decoder: Decoder) {
        super()
        this.subs = new Set();
    }

    protected override getReply(url: string, observe: 'body' | 'events' | 'response' | 'emit'): string {
        switch (observe) {
            case 'emit':
                return '';
            default:
                return url + '.reply'
        }
    }

    protected getClientOpts(req: TransportRequest<any>) {
        return req.context.get(REDIS_CLIENT_OPTS)
    }

    protected bindMessageEvent(session: TransportSession<ReidsTransport>, packet: Packet, req: TransportRequest<any>, observer: Observer<TransportEvent>): [string, (...args: any[]) => void] {
        const reply = packet.replyTo;
        if (!reply) return [] as any;

        if (!this.subs.has(reply)) {
            this.subs.add(reply);
            session.socket.subscriber.subscribe(reply);
        }
        const id = packet.id!;
        const url = packet.topic ?? packet.url!;
        const onMessage = (channel: string, res: any) => {
            if (channel !== reply) return;
            this.handleMessage(id, url, req, observer, res)
        };

        session.on(ev.MESSAGE, onMessage);

        return [ev.MESSAGE, onMessage];
    }

}

