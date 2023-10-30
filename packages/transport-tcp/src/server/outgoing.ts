import { SocketOutgoing } from '@tsdi/transport';
import * as net from 'net';
import * as tls from 'tls';

/**
 * outgoing message.
 */
export class TcpOutgoing extends SocketOutgoing<tls.TLSSocket | net.Socket, number> {

}
