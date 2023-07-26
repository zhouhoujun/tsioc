import { Outgoing, TransportEndpoint } from '@tsdi/transport';
import { Abstract } from '@tsdi/ioc';
import { NatsContext } from './context';

@Abstract()
export abstract class NatsEndpoint extends TransportEndpoint<NatsContext, Outgoing> {

}
