import { MessageIncoming } from '@tsdi/platform-server-transport';
import { NatsConnection } from 'nats';


export class NatsIncoming extends MessageIncoming<NatsConnection> {

}
