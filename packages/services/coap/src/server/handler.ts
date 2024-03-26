import { Abstract } from '@tsdi/ioc';
import { EndpointHandler, RequestContext } from '@tsdi/endpoints';
import { CoapServerOpts } from './options';


@Abstract()
export abstract class CoapEndpointHandler extends EndpointHandler<RequestContext, CoapServerOpts> {

}
