import { Abstract } from '@tsdi/ioc';
import { EndpointHandler, RequestContext } from '@tsdi/endpoints';
import { UdpServerOpts } from './options';


@Abstract()
export abstract class UdpEndpointHandler extends EndpointHandler<RequestContext, UdpServerOpts> {

}
