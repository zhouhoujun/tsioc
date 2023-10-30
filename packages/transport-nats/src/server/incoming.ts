import { MessageIncoming } from '@tsdi/transport';
import { NatsConnection } from 'nats';


export class NatsIncoming extends MessageIncoming<NatsConnection> {

}
