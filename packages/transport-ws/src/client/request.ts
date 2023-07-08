import { TransportEvent, Encoder, Decoder, StreamAdapter, StatusVaildator, TransportRequest, Redirector, TransportSession, Packet } from '@tsdi/core';
import { InjectFlags, Injectable, InvocationContext, Optional } from '@tsdi/ioc';
import { ev, MimeTypes, MimeAdapter, SessionRequestAdapter } from '@tsdi/transport';
import { Observer } from 'rxjs';
import { Duplex } from 'stream';
import { WS_CLIENT_OPTS, WsClientOpts } from './options';
import { WsTransportSession } from '../transport';

/**
 * tcp request adapter.
 */
@Injectable()
export class WsRequestAdapter extends SessionRequestAdapter<Duplex, WsClientOpts> {

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

    protected getSession(context: InvocationContext): TransportSession<Duplex> {
        return context.get(WsTransportSession, InjectFlags.Self)
    }

    protected override getReqUrl(req: TransportRequest<any>): string {
        return req.urlWithParams;
    }

    protected getClientOpts(req: TransportRequest<any>): WsClientOpts {
        return req.context.get(WS_CLIENT_OPTS);
    }

    protected override getReply(url: string, observe: 'body' | 'events' | 'response' | 'emit'): string {
        return '';
    }

    protected bindMessageEvent(session: TransportSession<any>, packet: Packet, req: TransportRequest<any>, observer: Observer<TransportEvent>): [string, (...args: any[]) => void] {
        const id = packet.id!;
        const url = packet.topic ?? packet.url!;
        const onMessage = (res: any) => this.handleMessage(id, url, req, observer, res);
        session.on(ev.MESSAGE, onMessage);
        return [ev.MESSAGE, onMessage];
    }

}

