import { Abstract } from '@tsdi/ioc';
import { EndpointHandler, RequestContext } from '@tsdi/endpoints';
import { TcpServerOpts } from './options';


@Abstract()
export abstract class TcpEndpointHandler extends EndpointHandler<RequestContext, TcpServerOpts> {

}

