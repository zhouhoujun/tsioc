import { TransportEvent, Encoder, Decoder,  TransportRequest, Redirector, TransportSession } from '@tsdi/core';
import { InjectFlags, Injectable, Optional } from '@tsdi/ioc';
import { StreamAdapter, ev, MimeTypes, StatusVaildator, MimeAdapter, SessionRequestAdapter } from '@tsdi/transport';
import { Observer } from 'rxjs';
import * as net from 'net';
import * as tls from 'tls';
import { TCP_CLIENT_OPTS, TcpClientOpts } from './options';
import { TCP_SOCKET, TcpTransportSessionFactory } from '../transport';

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

    protected createSession(req: TransportRequest<any>, opts: TcpClientOpts): TransportSession<net.Socket | tls.TLSSocket> {
        const context = req.context;
        const socket = context.get(TCP_SOCKET, InjectFlags.Self);
        return context.get(TcpTransportSessionFactory).create(socket, opts.transportOpts);
    }
    protected getClientOpts(req: TransportRequest<any>): TcpClientOpts {
        return req.context.get(TCP_CLIENT_OPTS);
    }

    protected bindMessageEvent(session: TransportSession<any>, id: number, url: string, req: TransportRequest<any>, observer: Observer<TransportEvent>): [string, (...args: any[]) => void] {
        const onMessage = (res: any) => this.handleMessage(id, url, req, observer, res);
        session.on(ev.MESSAGE, onMessage);
        return [ev.MESSAGE, onMessage];
    }

}

