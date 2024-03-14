import { Abstract } from '@tsdi/ioc';
import { EndpointHandler, RequestContext } from '@tsdi/endpoints';


@Abstract()
export abstract class TcpEndpoint extends EndpointHandler<RequestContext> {

}

