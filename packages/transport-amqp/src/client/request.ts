import { Encoder, Decoder, Redirector, StatusVaildator, StreamAdapter, TransportSession, UuidGenerator } from '@tsdi/core';
import { Injectable, Optional } from '@tsdi/ioc';
import { Packet, TransportEvent, TransportRequest } from '@tsdi/common';
import { ev, MimeTypes, MimeAdapter, SessionRequestAdapter } from '@tsdi/transport';
import { Observer } from 'rxjs';
import { Channel } from 'amqplib';
import { AMQP_CLIENT_OPTS, AmqpClientOpts } from './options';


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
        @Optional() readonly decoder: Decoder,
        private uuidGenner: UuidGenerator) {
        super()
        this.subs = new Set();
    }


    protected getClientOpts(req: TransportRequest<any>) {
        return req.context.get(AMQP_CLIENT_OPTS)
    }

    protected bindMessageEvent(session: TransportSession<Channel>, packet: Packet, req: TransportRequest<any>, observer: Observer<TransportEvent>, opts: AmqpClientOpts): [string, (...args: any[]) => void] {
        const id = packet.id!;
        const url = packet.topic ?? packet.url!;
        const replyQueue = opts.transportOpts!.replyQueue!;
        const onMessage = (queue: string, res: Packet) => {
            if (queue !== replyQueue && res.id !== id) return;
            this.handleMessage(id, url, req, observer, res);
        };

        session.on(ev.MESSAGE, onMessage);

        return [ev.MESSAGE, onMessage];
    }

    protected override getPacketId(): string {
        return this.uuidGenner.generate()
    }

}

