import { MessageOutgoing } from '@tsdi/platform-server-transport';
import { Socket } from 'dgram';



/**
 * outgoing message.
 */
export class UdpOutgoing extends MessageOutgoing<Socket, number> {

}
