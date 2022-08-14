import { Client, RequstOption } from '@tsdi/core';
import { ClientBuilder, ClientSession, TransportClient, TransportClientOpts } from '@tsdi/transport';
import { Observable } from 'rxjs';
import { Socket, IpcNetConnectOpts } from 'net';

export class TcpClientBuilder extends ClientBuilder<TransportClient> {

    build(transport: TransportClient, opts: TransportClientOpts): Observable<ClientSession> {
        const { logger, context }  = transport;
        const socket = new Socket(opts.connectOpts);
    }

}
