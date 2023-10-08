import { Abstract } from '@tsdi/ioc';
import { TransportEndpoint } from '@tsdi/endpoints';

@Abstract()
export abstract class AmqpEndpoint extends TransportEndpoint {

}
