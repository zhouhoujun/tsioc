import { TransportEvent, Encoder, Decoder, Redirector, TransportRequest, TransportSession } from '@tsdi/core';
import { InjectFlags, Injectable, Optional } from '@tsdi/ioc';
import { StreamAdapter, ev, MimeTypes, StatusVaildator, MimeAdapter, SessionRequestAdapter } from '@tsdi/transport';
import { Observer } from 'rxjs';
import { Client } from 'mqtt';
import { MQTT_CLIENT_OPTS, MqttClientOpts } from './options';
import { MqttTransportSessionFactory } from '../transport';

@Injectable()
export class MqttRequestAdapter extends SessionRequestAdapter<Client, MqttClientOpts> {

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

    protected createSession(req: TransportRequest<any>, opts: MqttClientOpts): TransportSession<Client> {
        const context = req.context;
        const client = context.get(Client, InjectFlags.Self);
        return context.get(MqttTransportSessionFactory).create(client, opts.transportOpts!);

    }
    protected getClientOpts(req: TransportRequest<any>) {
        return req.context.get(MQTT_CLIENT_OPTS)
    }

    protected bindMessageEvent(session: TransportSession<Client>, id: number, url: string, req: TransportRequest<any>, observer: Observer<TransportEvent>): [string, (...args: any[]) => void] {
        const reply = this.getReply(url, req.observe);
        if (!reply) return [] as any;

        if (!this.subs.has(reply)) {
            this.subs.add(reply);
            session.socket.subscribe(reply);
        }
        const onMessage = (channel: string, res: any) => {
            if (channel !== reply) return;
            this.handleMessage(id, url, req, observer, res)
        };

        session.on(ev.MESSAGE, onMessage);

        return [ev.MESSAGE, onMessage];
    }
}

