import { MessageIncoming } from '@tsdi/transport';
import * as amqp from 'amqplib';

export class AmqpIncoming extends MessageIncoming<amqp.Channel> {

}
