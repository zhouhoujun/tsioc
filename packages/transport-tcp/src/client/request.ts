import { Encoder, Decoder, StreamAdapter, StatusVaildator, Redirector, TransportSession } from '@tsdi/core';
import { Injectable, Optional } from '@tsdi/ioc';
import { TransportRequest, TransportEvent, Packet } from '@tsdi/common';
import { ev, MimeTypes, MimeAdapter, SessionRequestAdapter } from '@tsdi/transport';
import { Observer } from 'rxjs';
import * as net from 'net';
import * as tls from 'tls';
import { TCP_CLIENT_OPTS, TcpClientOpts } from './options';

/**
 * tcp request adapter.
 */
@Injectable()
export class TcpRequestAdapter extends SessionRequestAdapter<net.Socket | tls.TLSSocket, TcpClientOpts> {

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

    protected override getReqUrl(req: TransportRequest<any>): string {
        return req.urlWithParams;
    }

    protected getClientOpts(req: TransportRequest<any>): TcpClientOpts {
        return req.context.get(TCP_CLIENT_OPTS);
    }

    protected override getReply(url: string, observe: 'body' | 'events' | 'response' | 'emit'): string {
        return '';
    }

    protected bindMessageEvent(session: TransportSession<any>, packet: Packet, req: TransportRequest<any>, observer: Observer<TransportEvent>): [string, (...args: any[]) => void] {
        const id = packet.id!;
        const url = packet.topic || packet.url!;
        const onMessage = (res: any) => this.handleMessage(id, url, req, observer, res);
        session.on(ev.MESSAGE, onMessage);
        return [ev.MESSAGE, onMessage];
    }

}

