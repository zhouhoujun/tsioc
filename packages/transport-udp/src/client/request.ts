import { TransportEvent, Encoder, Decoder, StreamAdapter, StatusVaildator, TransportRequest, Redirector, TransportSession, Packet } from '@tsdi/core';
import { InjectFlags, Injectable, InvocationContext, Optional } from '@tsdi/ioc';
import { ev, MimeTypes, MimeAdapter, SessionRequestAdapter, hdr } from '@tsdi/transport';
import { Socket } from 'dgram';
import { Observer } from 'rxjs';
import { UDP_CLIENT_OPTS, UdpClientOpts } from './options';
import { UdpTransportSession } from '../transport';
import { udptl } from '../const';

/**
 * tcp request adapter.
 */
@Injectable()
export class UdpRequestAdapter extends SessionRequestAdapter<Socket, UdpClientOpts> {

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

    protected getSession(context: InvocationContext): TransportSession<Socket> {
        return context.get(UdpTransportSession, InjectFlags.Self)
    }

    protected override getReqUrl(req: TransportRequest<any>): string {
        return req.urlWithParams;
    }

    protected getClientOpts(req: TransportRequest<any>): UdpClientOpts {
        return req.context.get(UDP_CLIENT_OPTS);
    }

    protected override getReply(url: string, observe: 'body' | 'events' | 'response' | 'emit'): string {
        return '';
    }

    protected override toPacket(id: string | number, url: string, req: TransportRequest<any>): Packet<any> {
        const packet = super.toPacket(id, url, req);
        if (!packet.headers) {
            packet.headers = {};
        }
        packet.topic = udptl.test(url) ? new URL(url).host : 'localhost:3000';
        return packet;
    }

    protected bindMessageEvent(session: TransportSession<any>, packet: Packet, req: TransportRequest<any>, observer: Observer<TransportEvent>): [string, (...args: any[]) => void] {
        const id = packet.id!;
        const url = packet.url!;
        const onMessage = (topic: string, res: any) => this.handleMessage(id, url, req, observer, res);
        session.on(ev.MESSAGE, onMessage);
        return [ev.MESSAGE, onMessage];
    }

}


