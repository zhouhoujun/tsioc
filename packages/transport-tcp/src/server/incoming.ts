import { MessageIncoming } from '@tsdi/platform-server-transport';
import * as net from 'net';
import * as tls from 'tls';


export class TcpIncoming extends MessageIncoming<tls.TLSSocket | net.Socket> {

}
