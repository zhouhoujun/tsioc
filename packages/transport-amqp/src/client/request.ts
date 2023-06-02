import {  TransportEvent, Encoder, Decoder, TransportRequest, Redirector, TransportSessionFactory, TransportSession} from '@tsdi/core';
import { InjectFlags, Injectable, Optional } from '@tsdi/ioc';
import { StreamAdapter, ev, MimeTypes, StatusVaildator, MimeAdapter, SessionRequestAdapter } from '@tsdi/transport';
import { Observer } from 'rxjs';
import { Channel } from 'amqplib';
import { AMQP_CHANNEL, AMQP_CLIENT_OPTS, AmqpClientOpts } from './options';

@Injectable()
export class AmqpRequestAdapter extends SessionRequestAdapter<Channel> {

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

    protected createSession(req: TransportRequest<any>, opts: AmqpClientOpts): TransportSession<Channel> {
        const context = req.context;
        const channel = context.get(AMQP_CHANNEL, InjectFlags.Self);
        return context.get(TransportSessionFactory).create(channel, opts.transportOpts);
    }

    protected override getReply(url: string, observe: 'body' | 'events' | 'response'): string {
        return observe === 'events' ? url : url + '.reply';
    }

    protected getClientOpts(req: TransportRequest<any>) {
        return req.context.get(AMQP_CLIENT_OPTS)
    }

    protected bindMessageEvent(session: TransportSession<Channel>, id: number, url: string, req: TransportRequest<any>, observer: Observer<TransportEvent>): [string, (...args: any[]) => void] {
        const reply = this.getReply(url, req.observe);
        if (!this.subs.has(reply)) {
            this.subs.add(reply);
            session.socket.assertQueue(reply);
        }

        const onMessage = (channel: string, res: any) => {
            if (channel !== reply) return;
            this.handleMessage(id, url, req, observer, res)
        };

        session.on(ev.MESSAGE, onMessage);

        return [ev.MESSAGE, onMessage];
    }

}

