import { EndpointHandler, RequestContext } from '@tsdi/endpoints';
import { Abstract } from '@tsdi/ioc';
import { NatsMicroServOpts } from './options';

@Abstract()
export abstract class NatsEndpointHandler extends EndpointHandler<RequestContext, NatsMicroServOpts> {

}
