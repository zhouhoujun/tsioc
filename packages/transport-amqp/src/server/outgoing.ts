import * as amqp from 'amqplib';
import { MessageOutgoing } from '@tsdi/transport';



/**
 * outgoing message.
 */
export class AmqpOutgoing extends MessageOutgoing<amqp.Channel, number> {


}
