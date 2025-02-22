import { AbstractRequestHandler, RequestContext } from '@tsdi/endpoints';
import { Abstract } from '@tsdi/ioc';
import { NatsServConfig } from './options';

@Abstract()
export abstract class NatsRequestHandler extends AbstractRequestHandler<RequestContext, NatsServConfig> {

}
