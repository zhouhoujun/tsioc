import * as amqp from 'amqplib';
import { MessageOutgoing } from '@tsdi/platform-server-transport';



/**
 * outgoing message.
 */
export class AmqpOutgoing extends MessageOutgoing<amqp.Channel, number> {


}
