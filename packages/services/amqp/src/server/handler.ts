import { Abstract } from '@tsdi/ioc';
import { AbstractRequestHandler, RequestContext } from '@tsdi/endpoints';
import { AmqpMicroServiceOpts } from './options';

@Abstract()
export abstract class AmqpRequestHandler extends AbstractRequestHandler<RequestContext, AmqpMicroServiceOpts> {

}
