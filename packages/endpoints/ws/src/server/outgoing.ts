import { IDuplexStream } from '@tsdi/common';
import { MessageOutgoing } from '@tsdi/endpoints/assets';



/**
 * outgoing message.
 */
export class WsOutgoing extends MessageOutgoing<IDuplexStream, number> {

}
