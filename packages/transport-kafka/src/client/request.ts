import {
    TransportEvent, Encoder, Decoder, TransportRequest, Redirector, TransportSession, TransportSessionFactory, Packet
} from '@tsdi/core';
import { InjectFlags, Injectable, Optional } from '@tsdi/ioc';
import { StreamAdapter, MimeTypes, StatusVaildator, MimeAdapter, SessionRequestAdapter, ev } from '@tsdi/transport';
import { Observer } from 'rxjs';
import { KAFKA_CLIENT_OPTS, KafkaClientOpts } from './options';
import { KafkaTransport, KAFKA_TRANSPORT } from '../const';


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
        @Optional() readonly decoder: Decoder) {
        super()
    }


    protected createSession(req: TransportRequest<any>, opts: KafkaClientOpts): TransportSession<KafkaTransport> {
        const context = req.context;
        const client = context.get(KAFKA_TRANSPORT, InjectFlags.Self);
        return context.get(TransportSessionFactory).create(client, opts.transportOpts);
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

    protected bindMessageEvent(session: TransportSession<KafkaTransport>, id: string | number, url: string, req: TransportRequest<any>, observer: Observer<TransportEvent>, opts: KafkaClientOpts): [string, (...args: any[]) => void] {
        const replyTopic = this.getReply(url, req.observe);
        const onMessage = (topic: string, res: Packet) => {
            if (topic !== replyTopic && res.id !== id) return;
            this.handleMessage(id, url, req, observer, res);
        };

        session.on(ev.MESSAGE, onMessage);

        return [ev.MESSAGE, onMessage];
    }

}

