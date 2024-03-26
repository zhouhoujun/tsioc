import { Abstract } from '@tsdi/ioc';
import { EndpointHandler, RequestContext } from '@tsdi/endpoints';
import { AmqpMicroServiceOpts } from './options';

@Abstract()
export abstract class AmqpEndpointHandler extends EndpointHandler<RequestContext, AmqpMicroServiceOpts> {

}
