import { Abstract } from '@tsdi/ioc';
import { EndpointHandler, RequestContext } from '@tsdi/endpoints';


@Abstract()
export abstract class UdpEndpointHandler extends EndpointHandler<RequestContext> {

}
