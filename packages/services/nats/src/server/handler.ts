import { AbstractRequestHandler, RequestContext } from '@tsdi/endpoints';
import { Abstract } from '@tsdi/ioc';
import { NatsMicroServOpts } from './options';

@Abstract()
export abstract class NatsRequestHandler extends AbstractRequestHandler<RequestContext, NatsMicroServOpts> {

}
