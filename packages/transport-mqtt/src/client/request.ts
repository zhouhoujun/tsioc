import { Injectable, Optional } from '@tsdi/ioc';
import { Packet, TransportEvent, TransportRequest } from '@tsdi/common';
import { Encoder, Decoder, Redirector, StreamAdapter, StatusVaildator, TransportSession, ev, MimeTypes, MimeAdapter, SessionRequestAdapter } from '@tsdi/transport';
import { Observer } from 'rxjs';
import { Client } from 'mqtt';
import { MQTT_CLIENT_OPTS, MqttClientOpts } from './options';

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

    protected getClientOpts(req: TransportRequest<any>) {
        return req.context.get(MQTT_CLIENT_OPTS)
    }

    protected bindMessageEvent(session: TransportSession<Client>, packet: Packet, req: TransportRequest<any>, observer: Observer<TransportEvent>): [string, (...args: any[]) => void] {
        const reply = packet.replyTo;

        if (!reply) return [] as any;

        if (!this.subs.has(reply)) {
            this.subs.add(reply);
            session.socket.subscribe(reply);
        }
        const id = packet.id!;
        const url = packet.topic || packet.url!;
        const onMessage = (channel: string, res: any) => {
            if (channel !== reply) return;
            this.handleMessage(id, url, req, observer, res)
        };

        session.on(ev.MESSAGE, onMessage);

        return [ev.MESSAGE, onMessage];
    }
}

