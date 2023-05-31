import {
    TransportEvent, Encoder, Decoder, TransportRequest, Redirector, TransportSessionFactory, Subscriber, Publisher, TransportSession
} from '@tsdi/core';
import { InjectFlags, Injectable, Optional } from '@tsdi/ioc';
import { StreamAdapter, ev, MimeTypes, StatusVaildator, MimeAdapter, SessionRequestAdapter } from '@tsdi/transport';
import { Observer } from 'rxjs';
import { REDIS_CLIENT_OPTS, RedisClientOpts } from './options';
import { ReidsStream } from '../transport';

@Injectable()
export class RedisRequestAdapter extends SessionRequestAdapter<ReidsStream, RedisClientOpts> {

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

    protected createSession(req: TransportRequest<any>, opts: RedisClientOpts): TransportSession<ReidsStream> {
        const context = req.context;
        const subscriber = context.get(Subscriber, InjectFlags.Self);
        const publisher = context.get(Publisher, InjectFlags.Self);
        return context.get(TransportSessionFactory).create({
            subscriber,
            publisher
        }, opts.transportOpts);

    }
    protected getClientOpts(req: TransportRequest<any>) {
        return req.context.get(REDIS_CLIENT_OPTS)
    }

    protected bindMessageEvent(session: TransportSession<ReidsStream>, id: number, url: string, req: TransportRequest<any>, observer: Observer<TransportEvent>): [string, (...args: any[]) => void] {
        const reply = this.getReply(url, req.observe);
        if (!this.subs.has(reply)) {
            this.subs.add(reply);
            session.socket.subscriber.subscribe(reply);
        }
        const onMessage = (channel: string, res: any) => {
            if (channel !== reply) return;
            this.handleMessage(id, url, req, observer, res)
        };

        session.on(ev.MESSAGE, onMessage);

        return [ev.MESSAGE, onMessage];
    }

}

