import { SocketOutgoing } from '@tsdi/transport';
import { Duplex } from 'stream';



/**
 * outgoing message.
 */
export class WsOutgoing extends SocketOutgoing<Duplex, number> {

}
