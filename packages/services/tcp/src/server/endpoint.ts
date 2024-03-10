import { Abstract } from '@tsdi/ioc';
import { TransportEndpoint, RequestContext } from '@tsdi/endpoints';


@Abstract()
export abstract class TcpEndpoint extends TransportEndpoint<RequestContext> {

}

