import { SocketOutgoing } from '@tsdi/platform-server-transport';
import { Duplex } from 'stream';



/**
 * outgoing message.
 */
export class WsOutgoing extends SocketOutgoing<Duplex, number> {

}
