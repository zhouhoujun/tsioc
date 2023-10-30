import { MessageOutgoing } from '@tsdi/transport';
import { Socket } from 'dgram';



/**
 * outgoing message.
 */
export class UdpOutgoing extends MessageOutgoing<Socket, number> {

}
