import { Abstract } from '@tsdi/ioc';
import { AbstractRequestHandler, RequestContext } from '@tsdi/endpoints';
import { AmqpServConfig } from './options';

@Abstract()
export abstract class AmqpRequestHandler extends AbstractRequestHandler<RequestContext, AmqpServConfig> {

}
