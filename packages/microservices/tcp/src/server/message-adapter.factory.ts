import { Injectable } from '@tsdi/ioc';
import { MessageAdapterFactory, MessageAdapterFactoryOptions } from '@tsdi/common';
import * as net from 'node:net';
import * as tls from 'node:tls';
import { TcpMessageAdapter } from './message-adapter';

@Injectable()
export class TcpMessageAdapterFactory extends MessageAdapterFactory<net.Socket | tls.TLSSocket, net.Socket | tls.TLSSocket, TcpMessageAdapter> {
    create(options: MessageAdapterFactoryOptions<net.Socket | tls.TLSSocket, net.Socket | tls.TLSSocket>): TcpMessageAdapter {
        return new TcpMessageAdapter(options.request);
    }
}
