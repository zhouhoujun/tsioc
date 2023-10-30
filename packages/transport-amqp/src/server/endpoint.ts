import { Outgoing, TransportEndpoint } from '@tsdi/transport';
import { Abstract } from '@tsdi/ioc';
import { AmqpContext } from './context';

@Abstract()
export abstract class AmqpEndpoint extends TransportEndpoint<AmqpContext, Outgoing> {

}
