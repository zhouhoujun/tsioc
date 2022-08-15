import { Client, RequstOption } from '@tsdi/core';
import { ClientBuilder, ClientSession, PacketParser, TransportClient, TransportClientOpts } from '@tsdi/transport';
import { Observable } from 'rxjs';
import { Socket, IpcNetConnectOpts } from 'net';

export class TcpClientBuilder extends ClientBuilder<TransportClient> {

    build(transport: TransportClient, opts: TransportClientOpts): Observable<ClientSession> {
        const { logger, context }  = transport;
        const socket = new Socket(opts.connectOpts);
        const parser = context.get(PacketParser);
        return new ClientSession(socket, parser, opts.connectionOpts);
    }

}
