import { MessageIncoming } from '@tsdi/platform-server-transport';
import * as amqp from 'amqplib';

export class AmqpIncoming extends MessageIncoming<amqp.Channel> {

}
